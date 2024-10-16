import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ContentType } from '../../enums/PreviewAvailable';
import { eLinkType } from '../../enums/LinkType';
import { ToastService } from '@j3-inventory/shared';
import { DocumentViewerService } from '../../services/document-viewer.service';
import { ApiRequestService, AuthService, eApiBase, eCrud } from 'jibe-components';
import { IFileInfo } from '../../models/IFileInfo';
import { filter, map, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'jb-view-area',
  templateUrl: './view-area.component.html',
  styleUrls: ['./view-area.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAreaComponent implements OnChanges, OnDestroy {
  public previewAvailable = false;
  public readonly contentType = ContentType;
  public documentBlob: File = null;
  public fileInfo: IFileInfo[] = null;
  public notFound = false;
  @Input() public uniqHtmlId: string;
  /**
   * Handle file which should be shown in the view area.
   * If the file is of type 'text/html' it will be rendered in an iframe.
   * Other file types will be set up by 'src' property of iframe.
   * Change detection is triggered after setting the file to show correct iframe in html.
   *
   * @memberof ViewAreaComponent
   */
  @Input() public file: File;

  private readonly previewAvailableList = [
    ContentType.Gif,
    ContentType.Html,
    ContentType.Jpg,
    ContentType.Pdf,
    ContentType.Png,
    ContentType.Txt,
    ContentType.Mp4,
  ];

  private readonly scrollPosCache = new Map<string, number>();
  /**
   * Used to track if file value was changed and re-render the content depending on the file type.
   *
   * @param {SimpleChanges} changes
   * @return {*}  {Promise<void>}
   * @memberof ViewAreaComponent
   */
  // TODO: move ngOnChanges after constructor
  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes.file && changes.file.currentValue) {
      const file = changes.file.currentValue;

      if (this.previewAvailableList.includes(file.type) || (file.type === ContentType.Octet && file.name.endsWith('.mp4'))) {
        this.previewAvailable = true;
      } else {
        this.previewAvailable = false;
        const fileURL = URL.createObjectURL(file);
        const fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.download = file.name;
        fileLink.click();
      }
      this.cdr.detectChanges();

      if (file.type === ContentType.Html) {
        const iframeElement = this.document.querySelector(`#${this.uniqHtmlId}`) as HTMLIFrameElement;
        if (!iframeElement) {
          return;
        }
        const iframeDocument = iframeElement.contentWindow.document;

        await this.renderHtmlContent(iframeDocument, file);
        this.addEventHandlersToLinks(iframeDocument);

        const { anchor, DocId } = this.route.snapshot.queryParams;
        await this.waitUntilImagesLoaded(iframeElement.contentWindow);
        if (!anchor) {
          const currentScrollPos = this.scrollPosCache.get(DocId);
          this.scrollToPosition(iframeDocument, currentScrollPos);
        } else {
          this.scrollToAnchor(iframeDocument, anchor);
        }
      }
    }
  }

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly renderer: Renderer2,
    private readonly toastService: ToastService,
    private readonly documentViewerService: DocumentViewerService,
    private readonly authService: AuthService,
    private readonly apiRequestService: ApiRequestService,
  ) {}

  public ngOnDestroy(): void {
    this.scrollPosCache.clear();
  }

  /**
   * Used to render html content inside <iframe> tag. Uses `document.write` method to render the content.
   *
   * @private
   * @param {Document} iframeDocument
   * @param {Blob} doc
   * @return {*}  {Promise<void>}
   * @memberof ViewAreaComponent
   */
  private async renderHtmlContent(iframeDocument: Document, doc: Blob): Promise<void> {
    let data = await doc.text();
    data = this.parseAndUpdateLinks(data);

    iframeDocument.write(data);
    iframeDocument.close();
  }

  /**
   * Used to add event handlers to links in the iframe after content was rendered.
   * Add event listener with navigation options depends on link type.
   *
   * @private
   * @param {Document} iframeDocument
   * @memberof ViewAreaComponent
   */
  private addEventHandlersToLinks(iframeDocument: Document): void {
    const documentLinks = iframeDocument.querySelectorAll('a');

    documentLinks.forEach((link) => {
      this.renderer.listen(link, 'click', (event: Event) => {
        event.preventDefault();
        const linkType = link.dataset.linkType;
        switch (linkType) {
          case eLinkType.Absolute:
            window.open(link.href, '_blank');
            break;
          case eLinkType.Relative:
            {
              const href = link.getAttribute('href');
              const match = href.match(/[?&]DocId=([^&]*)/);
              const childDocId = match ? match[1] : null;

              const urlTree = this.router.parseUrl(href);
              const { DocId } = this.route.snapshot.queryParams;
              this.scrollPosCache.set(DocId, iframeDocument.defaultView.scrollY);
              const j2auth = this.documentViewerService.getJ2Auth(this.route.snapshot.queryParams);

              // const fileInfoItem = this.fileInfo.find((item) => item.docId === childDocId);
              // if(fileInfoItem) {
              //   const fileExtension = fileInfoItem.fileExtension;

              //   if (this.previewAvailableList.includes(this.getMimeTypeFromExtension(fileExtension)) || fileExtension === '.mp4') {
              //     this.router.navigateByUrl(`/qms?DocId=${DocId}`, { relativeTo: this.route }).then(() => {
              //       urlTree.queryParams = {
              //         DocId: urlTree.queryParams.DocId,
              //       };
              //       this.router.navigateByUrl(urlTree.toString(), { relativeTo: this.route });
              //     });
              //   } else {
              //     this.downloadFile(fileName, blob);
              //   }

              // }
              this.documentViewerService.getDocument$(j2auth, childDocId).subscribe((response) => {
                const blob: Blob = response.body as Blob;
                // this.fileInfo;
                const fileName = response.headers.get('Content-Disposition').split('filename=')[1] || 'download.xls';
                if (
                  this.previewAvailableList.includes(blob.type as ContentType) ||
                  (blob.type === ContentType.Octet && fileName.endsWith('.mp4'))
                ) {
                  this.router.navigateByUrl(`/qms?DocId=${DocId}`, { relativeTo: this.route }).then(() => {
                    urlTree.queryParams = {
                      DocId: urlTree.queryParams.DocId,
                    };
                    this.router.navigateByUrl(urlTree.toString(), { relativeTo: this.route });
                  });
                } else {
                  this.downloadFile(fileName, blob);
                }
              });
            }
            break;
          case eLinkType.Anchor:
            {
              const href = link.getAttribute('href');
              const urlTree = this.router.parseUrl(href);
              const { DocId } = this.route.snapshot.queryParams;
              const { anchor } = urlTree.queryParams;
              this.scrollPosCache.set(DocId, iframeDocument.defaultView.scrollY);
              this.router.navigateByUrl(urlTree.toString(), { relativeTo: this.route });
              this.scrollToAnchor(iframeDocument, anchor);
            }

            break;
          case eLinkType.Invalid:
            this.toastService.error({
              message: `Invalid link. This is data issue. Title - '${link.textContent}', href - '${link.getAttribute('href')}'`,
            });
            break;
          default:
            // eslint-disable-next-line no-console
            console.warn(`Invalid link ${link}`);
        }
      });
    });
  }

  public isVideo(file: any): boolean {
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'application/octet-stream'];
    return videoTypes.includes(file.type);
  }

  /**
   * Used as workaround to scroll to anchor in the iframe.
   *
   * @private
   * @param {Document} iframeDocument
   * @param {string} anchorId
   * @memberof ViewAreaComponent
   */
  private scrollToAnchor(iframeDocument: Document, anchorId: string): void {
    const element = iframeDocument.querySelector(`[name='${anchorId}']`);
    if (element) {
      const options: ScrollIntoViewOptions = { behavior: 'instant' } as unknown as ScrollIntoViewOptions;
      element.scrollIntoView(options);
    }
  }

  /**
   * Used to scroll to the position in the iframe or to top if position is not provided.
   *
   * @private
   * @param {Document} iframeDocument
   * @param {number} position
   * @memberof ViewAreaComponent
   */
  private scrollToPosition(iframeDocument: Document, position: number): void {
    const options: ScrollToOptions = { left: 0, behavior: 'instant' } as unknown as ScrollToOptions;
    if (position !== undefined) {
      options.top = position;
    } else {
      options.top = 0;
    }
    iframeDocument.defaultView.scrollTo(options);
  }

  /**
   * Used to parse links from html string and update them with some metadata.
   * If link is relative/anchor it will be updated to include query param `isMenuVisible=false` and target will be set to `_parent`.
   * For every link data attribute `linkType` will be added with the type of the link. Later it uses for handling click events.
   *
   * @param {string} htmlToChange
   * @return {*}  {string}
   */
  private parseAndUpdateLinks(htmlToChange: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlToChange, 'text/html');

    const links = doc.querySelectorAll('a');

    const docIds: string[] = [];

    links.forEach((link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');
      if (!href) {
        // here are handled tags without href attribute to not make additional checks in later conditions
        // eslint-disable-next-line no-console
        console.warn(`Invalid link. Title - '${link.textContent}', href - '${href}'`);
        link.dataset.linkType = eLinkType.Invalid;
        return;
      }
      if (href.startsWith('/')) {
        const withoutHash = href.split('#')[1];
        const match = href.match(/[?&]DocId=([^&]*)/);
        const childDocId = match ? match[1] : null;
        if (withoutHash) {
          docIds.push(childDocId);
        }
        const urlTree = this.router.parseUrl(withoutHash);

        urlTree.queryParams.isMenuVisible = false;
        const modifiedHref = urlTree.toString();
        link.dataset.linkType = urlTree.queryParams.anchor ? eLinkType.Anchor : eLinkType.Relative;
        link.setAttribute('href', modifiedHref);
        link.setAttribute('target', '_parent');
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        link.setAttribute('target', '_blank');
        link.dataset.linkType = eLinkType.Absolute;
      } else {
        // eslint-disable-next-line no-console
        console.warn(`Invalid link. Title - '${link.textContent}', href - '${href}'`);
        link.dataset.linkType = eLinkType.Invalid;
      }
    });

    if (docIds && docIds.length > 0) {
      this.loadFileDetails(docIds);
    }
debugger
    links.forEach((link: HTMLAnchorElement) => {
      link.setAttribute('title', 'Tariq and Haris');
      console.log('this');
      console.log(this.fileInfo);
      this.cdr.detectChanges();
    });

    const modifiedHtml = new XMLSerializer().serializeToString(doc);

    return modifiedHtml;
  }

  private async waitUntilImagesLoaded(iframeContentWindow: Window): Promise<unknown[]> {
    return Promise.all(
      Array.from(iframeContentWindow.document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            }),
        ),
    );
  }

  private async downloadFile(fileName: string, blob: Blob): Promise<void> {
    const file = new File([blob], fileName, { type: blob.type });
    const fileURL = URL.createObjectURL(file);
    const fileLink = document.createElement('a');
    fileLink.href = fileURL;
    fileLink.download = file.name;
    fileLink.click();
  }

  private async loadFileDetails(docIds: string[]): Promise<void> {
    const j2auth = this.documentViewerService.getJ2Auth(this.route.snapshot.queryParams);

    try {
      // Call the API and store the response
      const response = await this.getFilesDetails$(j2auth, docIds).toPromise();

      if (response.status === 404) {
        this.notFound = true;
        console.warn('Document not found');
        return;
      }

      const result: IFileInfo[] = [];

      if (response) {
        Object.keys(response).forEach((docId: string) => {
          const fileDetailsArray = response[docId];

          if (Array.isArray(fileDetailsArray) && fileDetailsArray.length > 0) {
            fileDetailsArray.forEach((fileDetails: any) => {
              if (!result.some((item) => item.docId === docId)) {
                result.push({
                  docId: docId,
                  filePath: fileDetails.FilePath,
                  fileExtension: fileDetails.Extension,
                });
              }
            });
          }
        });
      }

      // Set the result to the global variable
      this.fileInfo = result;

      console.log(this.fileInfo); // You can use this to debug and check if the global variable is set correctly
    } catch (error) {
      console.error('Error loading file details:', error);
      this.toastService.error({ message: 'Failed to load file details.' });
      throw error;
    }
  }

  public getFilesDetails$(auth: string, docIds: string[]): Observable<HttpResponse<IFileInfo>> {
    const apiRequest = {
      apiBase: eApiBase.CrewAPI,
      entity: 'quality',
      action: `get-files-detail`,
      crud: eCrud.Post,
      body: { docIds },
    };
    return this.apiRequestService.sendApiReq(apiRequest);
  }

  private getMimeTypeFromExtension(extension: string): ContentType {
    switch (extension.toLocaleLowerCase()) {
      case 'pdf':
        return ContentType.Pdf;
      case 'jpg':
      case 'jpeg':
        return ContentType.Jpg;
      case 'png':
        return ContentType.Png;
      case 'gif':
        return ContentType.Gif;
      case 'txt':
        return ContentType.Txt;
      case 'mp4':
        return ContentType.Mp4;
      default:
        return null;
    }
  }
}
