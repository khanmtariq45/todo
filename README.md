private async parseAndUpdateLinks(htmlToChange: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlToChange, 'text/html');

  const links = doc.querySelectorAll('a');

  const docIds: string[] = [];

  links.forEach((link: HTMLAnchorElement) => {
    const href = link.getAttribute('href');
    if (!href) {
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
      console.warn(`Invalid link. Title - '${link.textContent}', href - '${href}'`);
      link.dataset.linkType = eLinkType.Invalid;
    }
  });

  if (docIds && docIds.length > 0) {
    await this.loadFileDetails(docIds);  // Await here to ensure fileInfo is updated
  }

  links.forEach((link: HTMLAnchorElement) => {
    link.setAttribute('title', 'Tariq and Haris');
    console.log('this');
    console.log(this.fileInfo);
    this.cdr.detectChanges();
  });

  const modifiedHtml = new XMLSerializer().serializeToString(doc);

  return modifiedHtml;
}