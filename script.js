// Elementi DOM
const htmlInput = document.getElementById('htmlInput');
const descriptionInput = document.getElementById('descriptionInput');
const previewButton = document.getElementById('previewButton');
const generatePDFButton = document.getElementById('generatePDFButton');
const previewContainer = document.getElementById('previewContainer');
const historyContainer = document.getElementById('historyContainer');

// Event Listeners
window.onload = function() {
    renderHistory();  // Carica la cronologia all'avvio della pagina
};

previewButton.addEventListener('click', updatePreview);
generatePDFButton.addEventListener('click', generatePDF);

// Nuovo event listener per l'estrazione automatica del titolo
htmlInput.addEventListener('input', function() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(updatePreview, 300);
});

// Funzione per aggiornare l'anteprima del contenuto HTML
function updatePreview() {
    const rawHtml = htmlInput.value;

    if (!rawHtml.trim()) {
        alert('Per favore, inserisci del contenuto HTML per visualizzare l\'anteprima.');
        return;
    }

    const cleanHtml = DOMPurify.sanitize(rawHtml);  // Sanificazione del contenuto HTML per sicurezza

    // Creare un div editabile per permettere modifiche all'anteprima
    previewContainer.innerHTML = `
        <div id="editablePreview" contenteditable="true" style="border: 1px solid #ccc; padding: 10px;">
            ${cleanHtml}
        </div>
    `;

    // Estrai il titolo principale e imposta la descrizione
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;
    const mainTitle = tempDiv.querySelector('h1');
    if (mainTitle) {
        descriptionInput.value = mainTitle.textContent.trim();
    }
}

// Funzione per generare il PDF dal contenuto HTML
function generatePDF() {
    const description = descriptionInput.value.trim();
    const editablePreview = document.getElementById('editablePreview');

    if (!editablePreview || !editablePreview.innerHTML.trim()) {
        alert('Per favore, visualizza e modifica il contenuto HTML prima di generare un PDF.');
        return;
    }

    setButtonsState(true);

    const cleanHtml = DOMPurify.sanitize(editablePreview.innerHTML);
    const element = document.createElement('div');
    element.innerHTML = cleanHtml;

    const pdfFilename = description ? `${description}-${new Date().toISOString()}.pdf` : 'documento.pdf';

    const opt = {
        margin: [20, 20, 20, 20],
        filename: pdfFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 3,
            scrollX: 0, 
            scrollY: 0,
            windowWidth: element.scrollWidth
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break',  
            after: '.page-break',  
            avoid: '.no-break'      
        }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        const currentDate = new Date().toLocaleString();
        saveToHistory(currentDate, description);
        clearInputAndPreview();
        setButtonsState(false);
    }).catch(error => {
        console.error('Errore nella generazione del PDF:', error);
        alert('Si è verificato un errore durante la generazione del PDF. Dettagli: ' + error.message);
        setButtonsState(false);
    });
}

function clearInputAndPreview() {
    htmlInput.value = '';
    descriptionInput.value = '';
    previewContainer.innerHTML = '';
}

function saveToHistory(date, description) {
    const history = JSON.parse(localStorage.getItem('pdfHistory')) || [];
    const newEntry = {
        date: date,
        description: description || 'Nessuna descrizione',
        content: htmlInput.value
    };
    history.push(newEntry);
    localStorage.setItem('pdfHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('pdfHistory')) || [];
    historyContainer.innerHTML = '';

    history.forEach((entry, index) => {
        const pdfItem = document.createElement('div');
        pdfItem.className = 'pdf-item';

        const details = document.createElement('div');
        details.className = 'pdf-item-details';
        details.innerHTML = `
            <span><strong>Data:</strong> ${entry.date}</span>
            <span><strong>Descrizione:</strong> ${entry.description}</span>
        `;

        const buttons = document.createElement('div');
        buttons.className = 'pdf-item-buttons';

        const emailButton = document.createElement('button');
        emailButton.textContent = 'Invia Email';
        emailButton.onclick = () => sendEmail(entry.content);

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '🗑️';
        deleteButton.onclick = () => {
            history.splice(index, 1);
            localStorage.setItem('pdfHistory', JSON.stringify(history));
            renderHistory();
        };

        buttons.appendChild(emailButton);
        buttons.appendChild(deleteButton);

        pdfItem.appendChild(details);
        pdfItem.appendChild(buttons);

        historyContainer.appendChild(pdfItem);
    });
}

function sendEmail(htmlContent) {
    if (!htmlContent.trim()) {
        alert('Il contenuto HTML è vuoto. Non è possibile inviare un\'email.');
        return;
    }

    setButtonsState(true);

    Email.send({
        Host: "smtp.elasticemail.com",
        Username: "fracabu@gmail.com",
        Password: "20E1E352718B1E359B847CC697DCEE77F565",
        To: 'fracabu@gmail.com',
        From: 'fracabu@gmail.com',
        Subject: 'Contenuto HTML Generato',
        Body: htmlContent
    }).then(function (message) {
        alert("Email inviata con successo!");
        setButtonsState(false);
    }).catch(function (error) {
        console.error('Errore nell\'invio dell\'email:', error);
        alert("Errore nell'invio dell'email. Dettagli: " + error.message);
        setButtonsState(false);
    });
}

function exportHistory() {
    const history = localStorage.getItem('pdfHistory');
    if (history) {
        const blob = new Blob([history], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pdfHistory.json';
        a.click();
    } else {
        alert('Non ci sono dati di cronologia da esportare.');
    }
}

function clearHistory() {
    if (confirm("Sei sicuro di voler cancellare tutta la cronologia?")) {
        localStorage.removeItem('pdfHistory');
        renderHistory();
    }
}

function setButtonsState(isDisabled) {
    previewButton.disabled = isDisabled;
    generatePDFButton.disabled = isDisabled;
    const historyButtons = historyContainer.querySelectorAll('button');
    historyButtons.forEach(button => button.disabled = isDisabled);

    if (isDisabled) {
        generatePDFButton.innerHTML = 'Generazione in corso...';
    } else {
        generatePDFButton.innerHTML = 'Genera PDF';
    }
}