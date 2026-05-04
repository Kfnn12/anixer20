import fetch from "node-fetch";

async function run() {
  const url = "http://localhost:3000/api/proxy?url=" + encodeURIComponent("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
  console.log("Fetching: " + url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", res.headers.raw());
    const text = await res.text();
    console.log("Body preview:", text.slice(0, 200));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
