const url = 'BMplus_katalog_EN.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let pdfDoc = null,
    flipbook = $('#flipbook');

// Hned na začátku flipbook skryjeme, aby se nezobrazil roztažený, než se dopočítá poměr stran
flipbook.css('opacity', '0');

function resizeBook(initialViewport) {
    const containerWidth = $('#canvas-container').width() * 0.96;
    const containerHeight = $('#canvas-container').height() * 0.96;
    
    // Pokud ještě nemáme viewport z PDF, použijeme bezpečný výchozí poměr stran (cca A4 na výšku)
    const pageRatio = initialViewport ? (initialViewport.width / initialViewport.height) : 0.707;
    
    let bookHeight = containerHeight;
    let bookWidth = bookHeight * pageRatio * 2;
    
    if (bookWidth > containerWidth) {
        bookWidth = containerWidth;
        bookHeight = bookWidth / (pageRatio * 2);
    }
    
    return { width: bookWidth, height: bookHeight, ratio: pageRatio };
}

function executeSearch() {
    const query = $('#search-input').val().toLowerCase().trim();
    if (!query || !pdfDoc) return;

    const numPages = pdfDoc.numPages;
    let found = false;

    for (let i = 1; i <= numPages; i++) {
        pdfDoc.getPage(i).then(page => {
            page.getTextContent().then(textContent => {
                const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
                if (pageText.includes(query) && !found) {
                    found = true;
                    $('#flipbook').turn('page', i);
                    $('.search-box').css('background-color', 'rgba(0, 118, 55, 0.85)');
                    setTimeout(() => $('.search-box').css('background-color', 'rgba(40, 40, 40, 0.85)'), 500);
                }
            });
        });
        if (found) break;
    }
}

// Nastavíme přibližné rozměry hned při startu, aby kontejnery držely správný tvar
const initialDims = resizeBook(null);
flipbook.css({ width: initialDims.width, height: initialDims.height });

pdfjsLib.getDocument(url).promise.then(pdf => {
    pdfDoc = pdf;
    const numPages = pdf.numPages;
    
    $('#btn-end').attr('onclick', `$('#flipbook').turn('page', ${numPages})`);
    
    pdf.getPage(1).then(firstPage => {
        const initialViewport = firstPage.getViewport({ scale: 1.0 });
        const dimensions = resizeBook(initialViewport);
        
        // Přepočítáme na přesné rozměry podle reálného PDF
        flipbook.css({ width: dimensions.width, height: dimensions.height });

        let renderedPages = 0;

        for (let i = 1; i <= numPages; i++) {
            const pageDiv = $('<div class="page"></div>');
            const canvas = document.createElement('canvas');
            pageDiv.append(canvas);
            flipbook.append(pageDiv);

            pdf.getPage(i).then(page => {
                const pageTargetWidth = dimensions.width / 2;
                const pageViewport = page.getViewport({ scale: 1.0 });
                const scale = (pageTargetWidth / pageViewport.width) * 1.5; 
                const viewport = page.getViewport({ scale: scale });
                
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                page.render(renderContext).promise.then(() => {
                    renderedPages++;
                    if (renderedPages === numPages) {
                        // --- INICIALIZACE S PROFI STÍNY A PROPOJENÍM URL ---
                        flipbook.turn({
                            width: dimensions.width,
                            height: dimensions.height,
                            elevation: 60,
                            gradients: true,
                            duration: 1200, // Plynulá animace otočení
                            shadows: true,  // Aktivace stínů
                            autoCenter: true,
                            when: {
                                turning: function(event, page, pageObj) {
                                    // Mění hash v adresním řádku při listování
                                    window.location.hash = "page/" + page;
                                }
                            }
                        });
                        
                        // Načtení konkrétní stránky přímo z URL adresy při otevření webu
                        const hash = window.location.hash;
                        if (hash && hash.indexOf("page/") !== -1) {
                            const startPage = parseInt(hash.split("/")[1], 10);
                            if (!isNaN(startPage)) {
                                flipbook.turn("page", startPage);
                            }
                        }
                        
                        // Jakmile je vše načteno a na svém místě, plynule katalog odhalíme
                        flipbook.css('transition', 'opacity 0.3s ease');
                        flipbook.css('opacity', '1');
                        
                        window.addEventListener('wheel', function(e) {
                            if (e.deltaY > 0) {
                                flipbook.turn('next');
                            } else if (e.deltaY < 0) {
                                flipbook.turn('previous');
                            }
                        }, { passive: true });
                    }
                });
            });
        }
    });
});

$(window).resize(function() {
    if (pdfDoc) {
        pdfDoc.getPage(1).then(page => {
            const initialViewport = page.getViewport({ scale: 1.0 });
            const dimensions = resizeBook(initialViewport);
            flipbook.turn('size', dimensions.width, dimensions.height);
        });
    }
});
