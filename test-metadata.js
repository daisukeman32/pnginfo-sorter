const fs = require('fs');
const zlib = require('zlib');

function extractPNGText(buffer) {
  const chunks = {};
  let offset = 8; // PNGヘッダーをスキップ

  console.log('PNG file size:', buffer.length, 'bytes\n');

  try {
    while (offset < buffer.length) {
      if (offset + 12 > buffer.length) break;

      const length = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);

      console.log(`Chunk: ${type}, Length: ${length}`);

      if (type === 'tEXt') {
        const data = buffer.slice(offset + 8, offset + 8 + length);
        const nullIndex = data.indexOf(0);

        if (nullIndex !== -1) {
          const keyword = data.toString('ascii', 0, nullIndex);
          const text = data.toString('utf-8', nullIndex + 1);
          chunks[keyword] = text;
          console.log(`  ✓ tEXt: ${keyword}`);
        }
      } else if (type === 'iTXt') {
        const data = buffer.slice(offset + 8, offset + 8 + length);
        const nullIndex = data.indexOf(0);

        if (nullIndex !== -1) {
          const keyword = data.toString('ascii', 0, nullIndex);
          const text = data.toString('utf-8', nullIndex + 1);
          chunks[keyword] = text;
          console.log(`  ✓ iTXt: ${keyword}`);
        }
      } else if (type === 'zTXt') {
        const data = buffer.slice(offset + 8, offset + 8 + length);
        const nullIndex = data.indexOf(0);

        if (nullIndex !== -1) {
          const keyword = data.toString('ascii', 0, nullIndex);
          const compressionMethod = data[nullIndex + 1];

          if (compressionMethod === 0) {
            const compressedData = data.slice(nullIndex + 2);
            try {
              const decompressed = zlib.inflateSync(compressedData);
              const text = decompressed.toString('utf-8');
              chunks[keyword] = text;
              console.log(`  ✓ zTXt: ${keyword} (compressed)`);
            } catch (e) {
              console.log(`  ✗ zTXt: ${keyword} (decompression failed)`);
            }
          }
        }
      }

      offset += length + 12;
      if (type === 'IEND') break;
    }
  } catch (error) {
    console.error('Error extracting PNG text chunks:', error);
  }

  return chunks;
}

// テスト実行
const testFile = '00662-8172037.png';
console.log('='.repeat(60));
console.log('Testing PNG metadata extraction');
console.log('File:', testFile);
console.log('='.repeat(60) + '\n');

const buffer = fs.readFileSync(testFile);
const metadata = extractPNGText(buffer);

console.log('\n' + '='.repeat(60));
console.log('Extracted metadata:');
console.log('='.repeat(60));

for (const [key, value] of Object.entries(metadata)) {
  console.log(`\n[${key}]`);
  console.log(value.substring(0, 500) + (value.length > 500 ? '...' : ''));
}
