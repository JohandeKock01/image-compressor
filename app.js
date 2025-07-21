 const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const startBtn   = document.getElementById('start-btn');
const resultsTbl = document.getElementById('results').querySelector('tbody');
const resultsTable = document.getElementById('results');
let files = [];

const fmt = bytes => {
  const kb = bytes / 1024;
  return kb > 1024
    ? (kb / 1024).toFixed(2) + ' MB'
    : kb.toFixed(1) + ' KB';
};

function enableStart() {
  startBtn.disabled = files.length === 0;
  // Show files under the drop zone
  let fileList = document.getElementById('selected-files');
  if (!fileList) {
    fileList = document.createElement('div');
    fileList.id = 'selected-files';
    fileList.className = 'mt-2 text-sm text-gray-600';
    dropZone.appendChild(fileList);
  }
  fileList.innerHTML = files.length
    ? "Selected: " + files.map(f => f.name).join(', ')
    : "";
}

function handleFiles(fileList){
  files = [...fileList].slice(0,20); // limit 20
  enableStart();
  fileInput.value = ""; // Allow re-uploading the same file
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

startBtn.addEventListener('click', async () => {
  enableStart();
  resultsTbl.innerHTML = '';
  resultsTable.classList.remove('hidden');

  for(const file of files){
    let compressedBlob;
    let error = null;
    try {
      if(file.type === 'image/png'){
        const arrayBuffer = await file.arrayBuffer();
        const png = UPNG.decode(arrayBuffer);
        const quant = UPNG.encode([arrayBuffer], png.width, png.height, 256);
        compressedBlob = new Blob([quant], {type:'image/png'});
      } else {
        compressedBlob = await imageCompression(file, {
          maxSizeMB: 1,
          useWebWorker: true
        });
      }
    } catch (e) {
      error = e.message || 'Compression failed';
    }

    if (error) {
      resultsTbl.insertAdjacentHTML('beforeend', `
        <tr class="border-t bg-red-50">
          <td class="py-2 px-3 font-mono">${file.name}</td>
          <td class="py-2 px-3">${fmt(file.size)}</td>
          <td class="py-2 px-3 text-red-600" colspan="3">${error}</td>
        </tr>
      `);
      continue;
    }

    const percent = 100 - (compressedBlob.size / file.size * 100);
    const url  = URL.createObjectURL(compressedBlob);

    resultsTbl.insertAdjacentHTML('beforeend',`
      <tr class="border-t">
        <td class="py-2 px-3 font-mono">${file.name}</td>
        <td class="py-2 px-3">${fmt(file.size)}</td>
        <td class="py-2 px-3">${fmt(compressedBlob.size)}</td>
        <td class="py-2 px-3 font-semibold ${percent > 0 ? 'text-green-700' : 'text-gray-500'}">${percent > 0 ? percent.toFixed(1) : '0.0'} %</td>
        <td class="py-2 px-3">
          <a href="${url}" download="${file.name}" 
            class="inline-block px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold shadow transition"
            title="Download compressed image">
            ⬇️ Download
          </a>
        </td>
      </tr>
    `);
  }
});
