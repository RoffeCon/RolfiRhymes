// RolfiRhymes - Enkelt rimlexikon med CSV-import

// Data storage
let rhymeData = {};
let currentEditingWord = null;

// DOM elements
const S = document.getElementById;
const searchInput = S('searchInput');
const searchBtn = S('searchBtn');
const clearBtn = S('clearBtn');
const csvFile = S('csvFile');
const importBtn = S('importBtn');
const downloadTemplateBtn = S('downloadTemplateBtn');
const wordInput = S('wordInput');
const rhymeInput = S('rhymeInput');
const addBtn = S('addBtn');
const updateBtn = S('updateBtn');
const deleteBtn = S('deleteBtn');
const results = S('results');
const wordList = S('wordList');
const totalCount = S('totalCount');
const modal = S('modal');
const modalMessage = S('modalMessage');
const modalConfirm = S('modalConfirm');
const modalCancel = S('modalCancel');

// Initialize
function init() {
  loadData();
  setupEventListeners();
  renderWordList();
}

// Load data from localStorage
function loadData() {
  const saved = localStorage.getItem('rhymeData');
  if (saved) {
    try {
      rhymeData = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load data:', e);
      rhymeData = {};
    }
  }
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('rhymeData', JSON.stringify(rhymeData));
}

// Setup event listeners
function setupEventListeners() {
  // Search
  searchBtn.addEventListener('click', search);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') search();
  });
  clearBtn.addEventListener('click', clearSearch);

  // Import CSV
  importBtn.addEventListener('click', importCSV);
  downloadTemplateBtn.addEventListener('click', downloadTemplate);

  // Edit
  addBtn.addEventListener('click', addWord);
  updateBtn.addEventListener('click', updateWord);
  deleteBtn.addEventListener('click', () => confirmDelete());

  // Modal
  modalConfirm.addEventListener('click', () => {
    modal.hidden = true;
    if (modalConfirm.dataset.action === 'delete') {
      deleteWord();
    }
  });
  modalCancel.addEventListener('click', () => {
    modal.hidden = true;
  });
}

// Search for rhymes
function search() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    results.innerHTML = '<p class="hint">Skriv ett ord för att hitta rim.</p>';
    return;
  }

  const matches = [];
  
  // Direct match
  if (rhymeData[query]) {
    matches.push({ word: query, rhymes: rhymeData[query] });
  }
  
  // Check if query rhymes with any word
  for (const [word, rhymes] of Object.entries(rhymeData)) {
    if (rhymes.includes(query)) {
      matches.push({ word, rhymes });
    }
  }
  
  // Find words that have similar rhymes
  for (const [word, rhymes] of Object.entries(rhymeData)) {
    if (word.toLowerCase() !== query && 
        rhymes.some(r => r.toLowerCase().includes(query)) &&
        !matches.some(m => m.word === word)) {
      matches.push({ word, rhymes });
    }
  }

  displayResults(matches);
}

// Display search results
function displayResults(matches) {
  if (matches.length === 0) {
    results.innerHTML = '<p class="hint">Inga rim hittades.</p>';
    return;
  }

  results.innerHTML = matches.map(match => `
    <div class="rhyme-group">
      <div class="word">${escapeHtml(match.word)}</div>
      <div class="rhymes">
        ${match.rhymes.map(r => `<span>${escapeHtml(r)}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// Clear search
function clearSearch() {
  searchInput.value = '';
  results.innerHTML = '<p class="hint">Skriv ett ord för att hitta rim.</p>';
  searchInput.focus();
}

// Import CSV file
function importCSV() {
  const file = csvFile.files[0];
  if (!file) {
    showModal('Välj en CSV-fil först.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        
        const word = parts[0].toLowerCase();
        const rhymes = parts.slice(1).filter(p => p);
        
        rhymeData[word] = rhymes;
      }
      
      saveData();
      renderWordList();
      clearSearch();
      csvFile.value = '';
      
      showModal(`Importerade ${lines.length - 1} ord!`);
    } catch (e) {
      showModal('Fel vid import: ' + e.message);
    }
  };
  reader.readAsText(file);
}

// Download CSV template
function downloadTemplate() {
  const csv = 'ord,rimord1,rimord2,rimord3\n' +
              'sol,mol,hol,kol\n' +
              'kat,hat,mat,rat\n' +
              'hus,mus,plus,bus\n';
  
  downloadCSV(csv, 'rimlexikon_mall.csv');
}

// Add new word
function addWord() {
  const word = wordInput.value.trim().toLowerCase();
  const rhymes = rhymeInput.value.split(',').map(r => r.trim()).filter(r => r);
  
  if (!word) {
    showModal('Ange ett ord.');
    return;
  }
  
  if (!rhymes.length) {
    showModal('Ange minst ett rimord.');
    return;
  }
  
  rhymeData[word] = rhymes;
  saveData();
  renderWordList();
  
  // Clear inputs
  wordInput.value = '';
  rhymeInput.value = '';
  currentEditingWord = null;
  updateBtn.disabled = true;
  deleteBtn.disabled = true;
  
  showModal(`Lade till: ${word}`);
}

// Update existing word
function updateWord() {
  if (!currentEditingWord) return;
  
  const word = wordInput.value.trim().toLowerCase();
  const rhymes = rhymeInput.value.split(',').map(r => r.trim()).filter(r => r);
  
  if (!word) {
    showModal('Ange ett ord.');
    return;
  }
  
  if (!rhymes.length) {
    showModal('Ange minst ett rimord.');
    return;
  }
  
  // Remove old entry
  delete rhymeData[currentEditingWord];
  
  // Add new entry
  rhymeData[word] = rhymes;
  saveData();
  renderWordList();
  
  currentEditingWord = null;
  updateBtn.disabled = true;
  deleteBtn.disabled = true;
  
  showModal(`Uppdaterade till: ${word}`);
}

// Confirm delete
function confirmDelete() {
  if (!currentEditingWord) return;
  
  modalMessage.textContent = `Ta bort "${currentEditingWord}"?`;
  modalConfirm.textContent = 'Ta bort';
  modalConfirm.dataset.action = 'delete';
  modal.hidden = false;
}

// Delete word
function deleteWord() {
  if (!currentEditingWord) return;
  
  delete rhymeData[currentEditingWord];
  saveData();
  renderWordList();
  
  // Clear inputs
  wordInput.value = '';
  rhymeInput.value = '';
  currentEditingWord = null;
  updateBtn.disabled = true;
  deleteBtn.disabled = true;
  
  modal.hidden = true;
}

// Render word list
function renderWordList() {
  const words = Object.keys(rhymeData).sort();
  totalCount.textContent = words.length;
  
  wordList.innerHTML = words.map(word => `
    <div class="word-item ${currentEditingWord === word ? 'editing' : ''}" 
         data-word="${word}">
      ${escapeHtml(word)}
    </div>
  `).join('');
  
  // Add click handlers
  wordList.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => {
      const word = item.dataset.word;
      editWord(word);
    });
  });
}

// Edit word
function editWord(word) {
  currentEditingWord = word;
  wordInput.value = word;
  rhymeInput.value = rhymeData[word].join(', ');
  updateBtn.disabled = false;
  deleteBtn.disabled = false;
  addBtn.disabled = true;
  
  renderWordList();
  wordInput.focus();
}

// Show modal
function showModal(message) {
  modalMessage.textContent = message;
  modalConfirm.textContent = 'OK';
  modalConfirm.dataset.action = '';
  modalCancel.hidden = true;
  modal.hidden = false;
}

// Download CSV
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
