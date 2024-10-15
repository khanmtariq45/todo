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
import { ActivatedRoute, Router } from '@angular/router';
import { ContentType } from '../../enums/PreviewAvailable';
import { eLinkType } from '../../enums/LinkType';
import { ToastService } from '@j3-inventory/shared';

@Component({
  selector: 'jb-view-area',
  templateUrl: './view-area.component.html',
  styleUrls: ['./view-area.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewAreaComponent implements OnChanges, OnDestroy {
  public previewAvailable = false;
  public readonly contentType = ContentType;
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
    ContentType.MP4,
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

      if (this.previewAvailableList.includes(file.type)) {
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
              const urlTree = this.router.parseUrl(href);
              const { DocId } = this.route.snapshot.queryParams;
              this.scrollPosCache.set(DocId, iframeDocument.defaultView.scrollY);
              this.router.navigateByUrl(`/qms?DocId=${DocId}`, { relativeTo: this.route }).then(() => {
                urlTree.queryParams = {
                  DocId: urlTree.queryParams.DocId,
                };
                this.router.navigateByUrl(urlTree.toString(), { relativeTo: this.route });
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

  private isVideo(file: any): boolean {
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'application/octet-stream'];
    return videoTypes.includes(file.type);
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
        // here are handled invalid format of links
        // eslint-disable-next-line no-console
        console.warn(`Invalid link. Title - '${link.textContent}', href - '${href}'`);
        link.dataset.linkType = eLinkType.Invalid;
      }
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
}
