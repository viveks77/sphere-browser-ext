export default defineBackground(() => {
  browser.sidePanel.setOptions({
    path: "sidepanel.html",
    enabled: true,
  })
  console.log('Hello background!', { id: browser.runtime.id });
});
