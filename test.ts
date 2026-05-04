async function test() {
  const targetUrl = 'https://rrr.shop21pro.site/p6w2/c6/h9ac41b5fc66bd2c7fc5f1a108a24cbea4e3bf97cf39e1472858e3893da47488bc571550cd7fbe9d1f616719c4e56eb799e9a8253245626268ec2c5b3e76745efb2b1ed59f96e3fc6f7c1c6c738/list,3I1YCZMgsMvr.m3u8';
  const serverUrl = 'http://127.0.0.1:3000/api/proxy?url=' + encodeURIComponent(targetUrl);
  const r = await fetch(serverUrl);
  console.log(r.status);
  const t = await r.text();
  console.log(t.substring(0, 500));
}
test();
