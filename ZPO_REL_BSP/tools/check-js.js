/* Ekstrak blok <script> utama main.htm, stub placeholder ABAP,
   lalu cek sintaks JS. Exit 0 = OK. */
var fs   = require('fs');
var path = require('path');

var file = path.join(__dirname, '..', 'Page with FLow Logic', 'main.htm');
var src  = fs.readFileSync(file, 'utf8');

var start = src.indexOf('<script>');
var end   = src.lastIndexOf('</script>');
if (start < 0 || end < 0 || end <= start) {
  console.error('script block not found');
  process.exit(1);
}

var js = src.slice(start + '<script>'.length, end);
/* <%= lv_json1 %> dsb. bukan JS — ganti stub array kosong */
js = js.replace(/<%=[\s\S]*?%>/g, '[]');

try {
  new Function(js);
  console.log('JS SYNTAX OK');
} catch (e) {
  console.error('JS SYNTAX ERROR: ' + e.message);
  process.exit(1);
}
