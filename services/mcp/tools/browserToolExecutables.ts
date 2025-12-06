export async function getActiveTabId(): Promise<number> {
  const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs.length === 0 || !tabs[0].id) {
    // Fallback: try getting any active tab if lastFocusedWindow fails
    const allActiveTabs = await browser.tabs.query({ active: true });
    if (allActiveTabs.length > 0 && allActiveTabs[0].id) {
      console.log("Fallback active tab id", allActiveTabs[0].id);
      return allActiveTabs[0].id;
    }
    throw new Error("No active tab found");
  }
  console.log("active tab id", tabs[0].id);
  return tabs[0].id;
}

export async function navigate(url: string) {
  const tabId = await getActiveTabId();
  await browser.tabs.update(tabId, { url });

  // Wait for navigation to complete
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error("Navigation timed out"));
    }, 30000); // 30s timeout

    const listener = (tid: number, changeInfo: any) => {
      if (tid === tabId && changeInfo.status === "complete") {
        browser.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeoutId);
        resolve();
      }
    };
    browser.tabs.onUpdated.addListener(listener);
  });
}

export async function getContent(): Promise<string> {
  const tabId = await getActiveTabId();
  const result = await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      const clone = document.body.cloneNode(true) as HTMLElement;

      const elementsToRemove = clone.querySelectorAll(
        "script, style, noscript, svg, path"
      );
      elementsToRemove.forEach((el) => el.remove());

      const removeComments = (node: Node) => {
        const childNodes = node.childNodes;
        for (let i = childNodes.length - 1; i >= 0; i--) {
          const child = childNodes[i];
          if (child.nodeType === 8) {
            node.removeChild(child);
          } else if (child.nodeType === 1) {
            removeComments(child);
          }
        }
      };
      removeComments(clone);

      return clone.outerHTML;
    },
  });

  return result[0].result || "";
}

export async function click(selector: string) {
  const tabId = await getActiveTabId();
  await browser.scripting.executeScript({
    target: { tabId },
    func: (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.click();
      } else {
        throw new Error(`Element not found: ${sel}`);
      }
    },
    args: [selector],
  });
}

export async function type(selector: string, text: string) {
  const tabId = await getActiveTabId();
  await browser.scripting.executeScript({
    target: { tabId },
    func: (sel: string, t: string) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      console.log("no element found", el);
      if (el) {
        console.log("element found", el);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();

        const nativeInputValueSetter =
          Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, t);
        } else {
          el.value = t;
        }

        console.log("element typed", el.value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
      } else throw new Error(`Element not found: ${sel}`);
    },
    args: [selector, text],
  });
}

export async function executeScript(script: string) {
  const tabId = await getActiveTabId();
  const result = await browser.scripting.executeScript({
    target: { tabId },
    func: async (code: string) => {
      try {
        const fn = new Function(`
          "use strict";
          return (async () => {
            ${code}
          })();
        `);

        const output = await fn();
        return { success: true, result: output };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
    args: [script],
  });

  const executionResult = result[0].result;
  if (!executionResult) throw new Error("Script execution returned no result");

  if (!executionResult.success)
    throw new Error(`Script execution failed: ${executionResult.error}`);

  return executionResult.result;
}
