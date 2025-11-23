export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx) {
    console.log('Hello content.');
    console.log('conext', ctx);
  },
});
