const originalFetch = globalThis.fetch;

globalThis.fetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  console.log(`Fetching: ${url}`);
  console.log("Options:", options);
  const response = await originalFetch(url, options);
  console.log(`Response Status: ${response.status}`);
  return response;
};
