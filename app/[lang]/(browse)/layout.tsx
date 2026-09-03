// Routing only. The browser lives in a layout so it never unmounts between browse pages;
// the trainer sits OUTSIDE this group and gets the whole screen (docs/adr/0003).
export { BrowseLayout as default } from '@/_app';
