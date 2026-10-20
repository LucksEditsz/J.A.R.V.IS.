"use strict";

/*
 * J.A.R.V.I.S. — SCRIPT COMPLETO
 *
 * Música: coloque os arquivos na mesma pasta do index.html:
 * musica-entrada.mp3
 * musica-2.mp3
 * time-today.mp3
 *
 * Câmera: tenta usar 1920x1080 quando disponível.
 * Galeria: fotos armazenadas localmente em IndexedDB.
 * Mensagens: importe a pasta extraída da exportação do Instagram.
 */

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const userInput = $("userInput");
const sendButton = $("sendButton");
const micButton = $("micButton");
const voiceStatus = $("voiceStatus");

const menu = $("menu");
const menuButton = $("menuButton");
const closeMenuButton = $("closeMenu");
const scrim = $("scrim");

const modal = $("modal");
const modalTitle = $("modalTitle");
const modalBody = $("modalBody");
const modalClose = $("modalClose");
const toast = $("toast");

let toastTimer;
let alarmTimer;
let stopwatchInterval;
let stopwatchStarted = 0;
let stopwatchElapsed = 0;
let cameraStream = null;
let audioPlayer = null;
let musicIndex = 0;
let waterTotal = Number(localRead("jarvis-water", "0")) || 0;
let galleryObjectUrls = [];

const tracks = [
    {
        title: "Iron Man",
        file: "musica-entrada.mp3"
    },
    {
        title: "Back in Black",
        file: "musica-2.mp3"
    },
    {
        title: "Time Today!",
        file: "time-today.mp3"
    }
];

/* ARMAZENAMENTO LOCAL */

function localRead(key, fallback = "") {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function localSave(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* MENU: ADICIONA A GALERIA */

if (menu && !menu.querySelector('[data-action="gallery"]')) {
    const galleryMenuButton = document.createElement("button");

    galleryMenuButton.type = "button";
    galleryMenuButton.className = "menu-item";
    galleryMenuButton.dataset.action = "gallery";
    galleryMenuButton.innerHTML = "<span>🖼️</span>Galeria";

    menu.appendChild(galleryMenuButton);
}

/* ESTADO DA INTERNET */

function updateNetworkStatus() {
    const status = document.querySelector(".online");

    if (!status) return;

    const online = navigator.onLine;

    status.classList.toggle("is-offline", !online);
    status.innerHTML = online
        ? "<i></i> SYSTEM ONLINE"
        : "<i></i> MODO OFFLINE";
}

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
updateNetworkStatus();

/* RELÓGIO, DATA E IDADE */

function calculateAge(birth) {
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
        months--;

        days += new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        ).getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return `${years} ANOS, ${months} MESES E ${days} DIAS`;
}

function updateClock() {
    const now = new Date();

    if ($("clock")) {
        $("clock").textContent = now.toLocaleTimeString("pt-BR");
    }

    if ($("date")) {
        $("date").textContent = now.toLocaleDateString("pt-BR");
    }

    if ($("ageDisplay")) {
        $("ageDisplay").textContent = calculateAge(
            new Date(2013, 0, 14)
        );
    }
}

updateClock();
setInterval(updateClock, 1000);

/* NOTIFICAÇÕES */

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

/* FALA */

function speak(message) {
    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.lang = "pt-BR";
    utterance.rate = 0.92;
    utterance.pitch = 0.78;

    const voices = speechSynthesis.getVoices();

    const ptVoice = voices.find(voice =>
        voice.lang.toLowerCase().startsWith("pt")
    );

    if (ptVoice) {
        utterance.voice = ptVoice;
    }

    speechSynthesis.speak(utterance);
}

/* CHAT */

function addMessage(message, type = "jarvis-message") {
    if (!chat) return;

    const wrapper = document.createElement("div");
    wrapper.className = `message ${type}`;

    const author = document.createElement("span");

    author.textContent = type === "user-message"
        ? "LUCAS SILVA"
        : "J.A.R.V.I.S.";

    const content = document.createElement("p");
    content.textContent = message;

    wrapper.append(author, content);
    chat.appendChild(wrapper);

    chat.scrollTop = chat.scrollHeight;
}

function respond(message, vocal = true) {
    addMessage(message);

    if (vocal) {
        speak(message);
    }
}

/* MENU */

function openMenu() {
    menu?.classList.add("open");
    scrim?.classList.add("open");

    menu?.setAttribute("aria-hidden", "false");
    menuButton?.setAttribute("aria-expanded", "true");
}

function hideMenu() {
    menu?.classList.remove("open");
    scrim?.classList.remove("open");

    menu?.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
}

menuButton?.addEventListener("click", () => {
    menu?.classList.contains("open")
        ? hideMenu()
        : openMenu();
});

closeMenuButton?.addEventListener("click", hideMenu);
scrim?.addEventListener("click", hideMenu);

/* CÂMERA E LIMPEZA DE RECURSOS */

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = $("cameraVideo");

    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

/* MODAIS */

function openModal(title, html) {
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = html;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");

    stopCamera();

    if (stopwatchInterval) {
        stopwatchElapsed += Date.now() - stopwatchStarted;

        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
}

modalClose?.addEventListener("click", closeModal);

modal?.addEventListener("click", event => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        hideMenu();
        closeModal();
    }
});

/* DICIONÁRIO OFFLINE */

const dictionary = {
    "algoritmo": "Sequência de instruções para resolver um problema.",
    "inteligência": "Capacidade de aprender, compreender e resolver problemas.",
    "inteligencia": "Capacidade de aprender, compreender e resolver problemas.",
    "inteligência artificial": "Tecnologia que permite a máquinas executar tarefas que normalmente exigem inteligência.",
    "inteligencia artificial": "Tecnologia que permite a máquinas executar tarefas que normalmente exigem inteligência.",
    "sistema": "Conjunto de elementos que funcionam em conjunto.",
    "planeta": "Corpo celeste que orbita uma estrela.",
    "gravidade": "Atração física entre corpos que possuem massa.",
    "energia": "Grandeza física associada à capacidade de provocar mudanças ou realizar trabalho.",
    "tecnologia": "Aplicação de conhecimento para criar ferramentas e soluções.",
    "probabilidade": "Medida da chance de um acontecimento ocorrer.",
    "futebol": "Esporte jogado por duas equipes, normalmente com onze jogadores cada.",
    "dados": "Informações que podem ser armazenadas, consultadas e analisadas.",
    "internet": "Rede mundial que conecta computadores e outros dispositivos.",
    "offline": "Estado em que um dispositivo ou serviço não está conectado à internet.",
    "online": "Estado em que um dispositivo ou serviço está conectado à rede."
};

function normalize(text) {
    return text
        .trim()
        .toLowerCase()
        .normalize("NFC");
}

function showDictionary() {
    openModal("DICIONÁRIO", `
        <div class="jarvis-tool">
            <p>Consulte palavras no dicionário local ou pesquise na web.</p>

            <input
                id="dictInput"
                placeholder="Digite uma palavra..."
                autocomplete="off"
            >

            <button id="dictSearch">CONSULTAR DICIONÁRIO LOCAL</button>
            <button id="dictWeb">PESQUISAR NA INTERNET</button>

            <div id="dictResult" class="tool-result">
                Pronto para pesquisar.
            </div>
        </div>
    `);

    function lookup() {
        const value = $("dictInput").value.trim();

        if (!value) {
            $("dictResult").textContent = "Digite uma palavra.";
            return;
        }

        const found = dictionary[normalize(value)];

        $("dictResult").textContent = found
            ? `${value}: ${found}`
            : navigator.onLine
                ? "Essa palavra não está no dicionário local. Tente a pesquisa na internet."
                : "Essa palavra não está no dicionário local e você está offline.";
    }

    $("dictSearch").addEventListener("click", lookup);

    $("dictInput").addEventListener("keydown", event => {
        if (event.key === "Enter") lookup();
    });

    $("dictWeb").addEventListener("click", () => {
        const word = $("dictInput").value.trim();

        if (!word) {
            $("dictResult").textContent = "Digite uma palavra.";
            return;
        }

        if (!navigator.onLine) {
            $("dictResult").textContent = "A pesquisa online exige internet.";
            return;
        }

        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent("significado de " + word),
            "_blank"
        );
    });
}

/* CALCULADORA */

function showCalculator() {
    openModal("CALCULADORA", `
        <div class="jarvis-tool">
            <input id="calcInput" placeholder="Ex.: (25 + 10) * 2">
            <button id="calcButton">CALCULAR</button>
            <div id="calcResult" class="tool-result">Resultado: —</div>
        </div>
    `);

    function calculate() {
        const expr = $("calcInput").value.trim();

        if (!expr || !/^[0-9+\-*/().%\s]+$/.test(expr)) {
            $("calcResult").textContent = "Digite uma conta válida.";
            return;
        }

        try {
            const result = Function(`"use strict"; return (${expr})`)();

            if (!Number.isFinite(result)) {
                throw new Error("Resultado inválido.");
            }

            $("calcResult").textContent = `Resultado: ${result}`;
        } catch {
            $("calcResult").textContent = "Não foi possível calcular.";
        }
    }

    $("calcButton").addEventListener("click", calculate);

    $("calcInput").addEventListener("keydown", event => {
        if (event.key === "Enter") calculate();
    });
}

/* BLOCO DE NOTAS OFFLINE */

function showNotes() {
    openModal("BLOCO DE NOTAS", `
        <div class="jarvis-tool">
            <p>As notas são armazenadas localmente neste navegador.</p>
            <textarea
                id="noteText"
                placeholder="Escreva suas anotações..."
            ></textarea>
            <button id="noteSave">SALVAR</button>
        </div>
    `);

    $("noteText").value = localRead("jarvis-notes");

    $("noteSave").addEventListener("click", () => {
        const ok = localSave("jarvis-notes", $("noteText").value);

        showToast(ok ? "NOTAS SALVAS" : "NÃO FOI POSSÍVEL SALVAR");
    });
}

/* CALENDÁRIO */

function showCalendar() {
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    openModal("CALENDÁRIO", `
        <div class="jarvis-tool">
            <div class="calendar-controls">
                <select id="calMonth">
                    ${months.map((month, index) =>
                        `<option value="${index}">${month}</option>`
                    ).join("")}
                </select>

                <select id="calYear">
                    ${Array.from({ length: 201 }, (_, index) => 1900 + index)
                        .map(year =>
                            `<option value="${year}">${year}</option>`
                        ).join("")}
                </select>
            </div>

            <div id="calendarGrid" class="calendar-grid"></div>
        </div>
    `);

    $("calMonth").value = new Date().getMonth();
    $("calYear").value = new Date().getFullYear();

    function render() {
        const month = Number($("calMonth").value);
        const year = Number($("calYear").value);

        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();

        let html = [
            "DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"
        ].map(day =>
            `<span class="calendar-day">${day}</span>`
        ).join("");

        html += "<span></span>".repeat(firstDay);

        for (let day = 1; day <= days; day++) {
            const today = new Date();

            const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate();

            html += `
                <span class="calendar-date ${isToday ? "today" : ""}">
                    ${day}
                </span>
            `;
        }

        $("calendarGrid").innerHTML = html;
    }

    $("calMonth").addEventListener("change", render);
    $("calYear").addEventListener("change", render);

    render();
}

/* ALARME LOCAL */

function showAlarm() {
    openModal("ALARME", `
        <div class="jarvis-tool">
            <p>O alarme funciona enquanto a interface estiver aberta.</p>

            <input id="alarmTime" type="datetime-local">

            <button id="alarmSet">ATIVAR ALARME</button>
            <button id="alarmCancel">CANCELAR</button>

            <p id="alarmStatus">Nenhum alarme ativo.</p>
        </div>
    `);

    $("alarmSet").addEventListener("click", () => {
        const value = $("alarmTime").value;
        const target = new Date(value);

        if (!value || target <= new Date()) {
            $("alarmStatus").textContent = "Escolha um horário futuro.";
            return;
        }

        clearInterval(alarmTimer);

        alarmTimer = setInterval(() => {
            if (Date.now() >= target.getTime()) {
                clearInterval(alarmTimer);
                alarmTimer = null;

                speak("Senhor, está na hora.");
                showToast("ALARME ATIVADO");

                if ($("alarmStatus")) {
                    $("alarmStatus").textContent = "ALARME DISPAROU.";
                }
            }
        }, 500);

        $("alarmStatus").textContent =
            `Alarme: ${target.toLocaleString("pt-BR")}`;
    });

    $("alarmCancel").addEventListener("click", () => {
        clearInterval(alarmTimer);
        alarmTimer = null;

        $("alarmStatus").textContent = "Alarme cancelado.";
    });
}

/* CRONÔMETRO */

function showStopwatch() {
    openModal("CRONÔMETRO", `
        <div class="jarvis-tool">
            <h2 id="stopwatchDisplay">00:00.0</h2>

            <button id="swStart">INICIAR</button>
            <button id="swPause">PAUSAR</button>
            <button id="swReset">ZERAR</button>
        </div>
    `);

    function update() {
        const ms = stopwatchElapsed +
            (stopwatchInterval
                ? Date.now() - stopwatchStarted
                : 0);

        const tenths = Math.floor(ms / 100);

        $("stopwatchDisplay").textContent =
            `${String(Math.floor(tenths / 600)).padStart(2, "0")}:` +
            `${String(Math.floor((tenths % 600) / 10)).padStart(2, "0")}.` +
            (tenths % 10);
    }

    $("swStart").addEventListener("click", () => {
        if (stopwatchInterval) return;

        stopwatchStarted = Date.now();
        stopwatchInterval = setInterval(update, 100);
    });

    $("swPause").addEventListener("click", () => {
        if (!stopwatchInterval) return;

        stopwatchElapsed += Date.now() - stopwatchStarted;

        clearInterval(stopwatchInterval);
        stopwatchInterval = null;

        update();
    });

    $("swReset").addEventListener("click", () => {
        clearInterval(stopwatchInterval);

        stopwatchInterval = null;
        stopwatchElapsed = 0;

        update();
    });

    update();
}

/* MONITOR DE ÁGUA */

function showWater() {
    openModal("MONITOR DE ÁGUA", `
        <div class="jarvis-tool">
            <p>Consumo registrado neste dispositivo:</p>

            <h2 id="waterDisplay">${waterTotal} ml</h2>

            <button id="water400">ADICIONAR 400 ML</button>

            <input
                id="waterAmount"
                type="number"
                min="1"
                placeholder="Quantidade em ml"
            >

            <button id="waterCustom">ADICIONAR QUANTIDADE</button>
            <button id="waterClear">ZERAR REGISTRO</button>
        </div>
    `);

    function update() {
        $("waterDisplay").textContent = `${waterTotal} ml`;

        localSave("jarvis-water", String(waterTotal));
    }

    $("water400").addEventListener("click", () => {
        waterTotal += 400;
        update();
    });

    $("waterCustom").addEventListener("click", () => {
        const amount = Number($("waterAmount").value);

        if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
            showToast("INFORME UMA QUANTIDADE VÁLIDA");
            return;
        }

        waterTotal += Math.round(amount);
        $("waterAmount").value = "";

        update();
    });

    $("waterClear").addEventListener("click", () => {
        waterTotal = 0;
        update();
    });
}

/* BANCO DE DADOS DA GALERIA */

const GALLERY_DB_NAME = "jarvis-gallery-db";
const GALLERY_DB_VERSION = 1;
const GALLERY_STORE = "photos";

function openGalleryDatabase() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
            reject(new Error("Armazenamento de galeria não disponível."));
            return;
        }

        const request = indexedDB.open(
            GALLERY_DB_NAME,
            GALLERY_DB_VERSION
        );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(GALLERY_STORE)) {
                database.createObjectStore(GALLERY_STORE, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(
            request.error || new Error("Erro ao abrir a galeria.")
        );
    });
}

async function savePhotoToGallery(blob, width, height) {
    const database = await openGalleryDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            GALLERY_STORE,
            "readwrite"
        );

        const store = transaction.objectStore(GALLERY_STORE);

        const request = store.add({
            blob,
            width,
            height,
            createdAt: new Date().toISOString(),
            type: blob.type || "image/jpeg"
        });

        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(
            request.error || new Error("Não foi possível salvar a foto.")
        );

        transaction.oncomplete = () => database.close();

        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Falha ao salvar a foto."));
        };
    });
}

async function getGalleryPhotos() {
    const database = await openGalleryDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            GALLERY_STORE,
            "readonly"
        );

        const request = transaction
            .objectStore(GALLERY_STORE)
            .getAll();

        request.onsuccess = () => {
            const photos = request.result || [];

            photos.sort((a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );

            resolve(photos);
        };

        request.onerror = () => reject(
            request.error || new Error("Não foi possível carregar as fotos.")
        );

        transaction.oncomplete = () => database.close();

        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Falha ao ler a galeria."));
        };
    });
}

async function deletePhotoFromGallery(id) {
    const database = await openGalleryDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            GALLERY_STORE,
            "readwrite"
        );

        const request = transaction
            .objectStore(GALLERY_STORE)
            .delete(Number(id));

        request.onsuccess = () => resolve(true);

        request.onerror = () => reject(
            request.error || new Error("Não foi possível excluir a foto.")
        );

        transaction.oncomplete = () => database.close();

        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Falha ao excluir a foto."));
        };
    });
}

function releaseGalleryObjectUrls() {
    galleryObjectUrls.forEach(url => URL.revokeObjectURL(url));
    galleryObjectUrls = [];
}

/* GALERIA */

async function showGallery() {
    stopCamera();

    releaseGalleryObjectUrls();

    openModal("GALERIA DE FOTOS", `
        <div class="jarvis-tool">
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                flex-wrap:wrap;
                margin-bottom:14px;
            ">
                <p style="margin:0;color:#72efff;">
                    FOTOS ARMAZENADAS NESTE DISPOSITIVO
                </p>

                <button id="galleryRefresh">ATUALIZAR</button>
            </div>

            <p id="galleryStatus">Carregando galeria...</p>

            <div id="galleryGrid" style="
                display:grid;
                grid-template-columns:repeat(auto-fill,minmax(145px,1fr));
                gap:12px;
                width:100%;
            "></div>
        </div>
    `);

    $("galleryRefresh").addEventListener("click", renderGallery);

    await renderGallery();
}

async function renderGallery() {
    const grid = $("galleryGrid");
    const status = $("galleryStatus");

    if (!grid || !status) return;

    releaseGalleryObjectUrls();

    grid.replaceChildren();
    status.textContent = "Carregando fotos...";

    try {
        const photos = await getGalleryPhotos();

        if (!grid.isConnected) return;

        if (!photos.length) {
            status.textContent =
                "Sua galeria está vazia. Abra a câmera e tire uma foto.";

            return;
        }

        status.textContent = `${photos.length} foto(s) na galeria.`;

        for (const photo of photos) {
            const objectUrl = URL.createObjectURL(photo.blob);
            galleryObjectUrls.push(objectUrl);

            const card = document.createElement("article");

            card.style.cssText = [
                "min-width:0",
                "padding:8px",
                "border:1px solid rgba(0,225,255,.3)",
                "border-radius:8px",
                "background:rgba(0,30,44,.65)"
            ].join(";");

            const image = document.createElement("img");

            image.src = objectUrl;
            image.alt = "Foto da galeria";
            image.loading = "lazy";

            image.style.cssText = [
                "width:100%",
                "aspect-ratio:4/3",
                "object-fit:cover",
                "display:block",
                "border-radius:5px",
                "cursor:pointer",
                "background:#02070a"
            ].join(";");

            image.addEventListener("click", () => {
                showPhotoViewer(photo);
            });

            const date = document.createElement("p");

            date.textContent = new Date(
                photo.createdAt
            ).toLocaleString("pt-BR");

            date.style.cssText =
                "font-size:10px;color:#9bdde8;line-height:1.5;overflow-wrap:anywhere;";

            const resolution = document.createElement("p");

            resolution.textContent =
                `${photo.width || "?"} × ${photo.height || "?"}`;

            resolution.style.cssText =
                "font-size:10px;color:#62eaff;margin:5px 0;";

            const openButton = document.createElement("button");

            openButton.type = "button";
            openButton.textContent = "VISUALIZAR";
            openButton.style.width = "100%";

            openButton.addEventListener("click", () => {
                showPhotoViewer(photo);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "EXCLUIR";
            deleteButton.style.width = "100%";
            deleteButton.style.marginTop = "5px";

            deleteButton.addEventListener("click", async () => {
                const confirmed = window.confirm(
                    "Deseja excluir esta foto da galeria?"
                );

                if (!confirmed) return;

                try {
                    await deletePhotoFromGallery(photo.id);
                    showToast("FOTO EXCLUÍDA");
                    await renderGallery();
                } catch (error) {
                    console.error(error);
                    showToast("NÃO FOI POSSÍVEL EXCLUIR A FOTO");
                }
            });

            card.append(
                image,
                date,
                resolution,
                openButton,
                deleteButton
            );

            grid.appendChild(card);
        }
    } catch (error) {
        console.error("Erro ao carregar a galeria:", error);

        status.textContent =
            "Não foi possível abrir a galeria neste ambiente.";
    }
}

function showPhotoViewer(photo) {
    const objectUrl = URL.createObjectURL(photo.blob);

    galleryObjectUrls.push(objectUrl);

    openModal("VISUALIZAR FOTO", `
        <div class="jarvis-tool">
            <img
                id="galleryBigPhoto"
                alt="Foto selecionada"
                style="
                    display:block;
                    width:100%;
                    max-height:70vh;
                    object-fit:contain;
                    background:#02070a;
                    border-radius:8px;
                "
            >

            <p style="color:#9bdde8;font-size:12px;">
                ${escapeHTML(
                    new Date(photo.createdAt).toLocaleString("pt-BR")
                )}
            </p>

            <p style="color:#62eaff;font-size:11px;">
                Resolução: ${Number(photo.width) || "?"} ×
                ${Number(photo.height) || "?"}
            </p>

            <button id="galleryBack">VOLTAR À GALERIA</button>
            <button id="galleryDeleteCurrent">EXCLUIR FOTO</button>
        </div>
    `);

    $("galleryBigPhoto").src = objectUrl;

    $("galleryBack").addEventListener("click", showGallery);

    $("galleryDeleteCurrent").addEventListener("click", async () => {
        if (!window.confirm("Deseja excluir esta foto?")) return;

        try {
            await deletePhotoFromGallery(photo.id);
            showToast("FOTO EXCLUÍDA");
            showGallery();
        } catch (error) {
            console.error(error);
            showToast("NÃO FOI POSSÍVEL EXCLUIR A FOTO");
        }
    });
}

/* CÂMERA — RESOLUÇÃO ALTA E FOTOS NA GALERIA */

async function showCamera() {
    stopCamera();

    openModal("CÂMERA HD", `
        <div class="jarvis-tool">
            <div style="
                width:100%;
                background:#010508;
                border:1px solid rgba(0,225,255,.35);
                border-radius:9px;
                overflow:hidden;
            ">
                <video
                    id="cameraVideo"
                    autoplay
                    playsinline
                    muted
                    style="
                        display:block;
                        width:100%;
                        height:auto;
                        max-height:65vh;
                        object-fit:contain;
                        background:#010508;
                    "
                ></video>
            </div>

            <p id="cameraStatus" style="
                font-size:12px;
                color:#62eaff;
                line-height:1.6;
            ">
                Preparando a câmera...
            </p>

            <div style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:12px;
            ">
                <button id="takePhotoButton" disabled>
                    📸 TIRAR FOTO
                </button>

                <button id="openGalleryFromCamera">
                    🖼️ ABRIR GALERIA
                </button>
            </div>

            <canvas id="cameraCanvas" hidden></canvas>

            <p style="font-size:10px;color:#9bdde8;">
                A qualidade máxima depende da câmera do dispositivo.
            </p>
        </div>
    `);

    const video = $("cameraVideo");
    const status = $("cameraStatus");
    const takePhotoButton = $("takePhotoButton");

    $("openGalleryFromCamera").addEventListener("click", () => {
        stopCamera();
        showGallery();
    });

    takePhotoButton.addEventListener("click", async () => {
        if (
            !video ||
            !video.videoWidth ||
            !video.videoHeight ||
            !cameraStream
        ) {
            status.textContent = "A câmera ainda não está pronta.";
            return;
        }

        const canvas = $("cameraCanvas");

        const width = video.videoWidth;
        const height = video.videoHeight;

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d", {
            alpha: false
        });

        if (!context) {
            status.textContent = "Não foi possível preparar a foto.";
            return;
        }

        context.drawImage(video, 0, 0, width, height);

        status.textContent = "Salvando foto na galeria...";
        takePhotoButton.disabled = true;

        try {
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    result => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(new Error("Falha ao gerar a foto."));
                        }
                    },
                    "image/jpeg",
                    0.95
                );
            });

            await savePhotoToGallery(blob, width, height);

            status.textContent =
                `Foto salva: ${width} × ${height} pixels.`;

            showToast("FOTO SALVA NA GALERIA");
        } catch (error) {
            console.error("Erro ao salvar a foto:", error);

            status.textContent =
                "Não foi possível salvar. Verifique o espaço disponível.";
        } finally {
            if (takePhotoButton.isConnected) {
                takePhotoButton.disabled = false;
            }
        }
    });

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error(
                "A câmera exige um ambiente compatível e permissão de acesso."
            );
        }

        const highQualityConstraints = {
            audio: false,
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: { ideal: 16 / 9 },
                frameRate: { ideal: 30 }
            }
        };

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia(
                highQualityConstraints
            );
        } catch (highQualityError) {
            console.warn(
                "Tentando abrir a câmera com resolução padrão:",
                highQualityError
            );

            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        }

        if (!video.isConnected) {
            stopCamera();
            return;
        }

        video.srcObject = cameraStream;

        await video.play();

        const videoTrack = cameraStream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings?.() || {};

        const width = settings.width || video.videoWidth;
        const height = settings.height || video.videoHeight;

        status.textContent =
            `Câmera ativa • ${width} × ${height} pixels`;

        takePhotoButton.disabled = false;
    } catch (error) {
        console.error("Erro ao iniciar a câmera:", error);

        status.textContent =
            "Câmera indisponível. Verifique as permissões do sistema.";
    }
}

/* MENSAGENS RECENTES — CONTATOS CLICÁVEIS */

function showRecentMessages() {
    openModal("MENSAGENS RECENTES", `
        <style>
            .ig-layout {
                display:grid;
                grid-template-columns:minmax(130px,.85fr) minmax(0,1.5fr);
                gap:10px;
                min-width:0;
            }

            .ig-contacts,
            .ig-thread {
                min-width:0;
                overflow:hidden;
                border:1px solid rgba(0,225,255,.3);
                border-radius:8px;
                background:rgba(0,12,24,.92);
            }

            .ig-title {
                padding:11px;
                color:#50eaff;
                border-bottom:1px solid rgba(0,225,255,.2);
                font-size:11px;
                letter-spacing:1px;
            }

            .ig-contact-list {
                max-height:360px;
                overflow:auto;
            }

            .ig-contact {
                display:flex;
                gap:8px;
                align-items:center;
                width:100%;
                padding:10px;
                text-align:left;
                color:#c7faff;
                border:0;
                border-bottom:1px solid rgba(0,225,255,.12);
                background:transparent;
                cursor:pointer;
                font-size:12px;
                overflow-wrap:anywhere;
            }

            .ig-contact:hover,
            .ig-contact.active {
                background:rgba(0,225,255,.14);
                color:#fff;
            }

            .ig-contact span {
                min-width:0;
                overflow-wrap:anywhere;
            }

            .ig-thread-heading {
                padding:12px;
                border-bottom:1px solid rgba(0,225,255,.2);
                color:#e3fcff;
                overflow-wrap:anywhere;
            }

            .ig-message-list {
                display:flex;
                flex-direction:column;
                gap:10px;
                max-height:400px;
                overflow:auto;
                padding:12px;
            }

            .ig-message {
                align-self:flex-start;
                max-width:90%;
                padding:10px;
                color:#e4fbff;
                background:rgba(0,139,160,.13);
                border:1px solid rgba(0,225,255,.25);
                border-radius:10px 10px 10px 3px;
                overflow-wrap:anywhere;
                word-break:break-word;
                font-size:12px;
                line-height:1.6;
            }

            .ig-message.own {
                align-self:flex-end;
                background:rgba(0,180,150,.13);
                border-color:rgba(70,255,220,.3);
                border-radius:10px 10px 3px 10px;
            }

            .ig-sender {
                color:#55eaff;
                font-size:10px;
                font-weight:bold;
                margin-bottom:5px;
            }

            .ig-time {
                color:#80b8c2;
                font-size:9px;
                margin-top:7px;
            }

            .ig-muted {
                padding:13px;
                color:#8dbac2;
                font-size:11px;
                line-height:1.6;
                overflow-wrap:anywhere;
            }

            @media(max-width:600px) {
                .ig-layout {
                    grid-template-columns:minmax(0,1fr);
                }

                .ig-contact-list {
                    max-height:180px;
                }

                .ig-message-list {
                    max-height:310px;
                }
            }
        </style>

        <div class="jarvis-tool">
            <p>
                Selecione a pasta extraída da exportação do Instagram,
                incluindo chats.html e a pasta your_instagram_activity.
            </p>

            <input
                id="instagramExportFolder"
                type="file"
                webkitdirectory
                directory
                multiple
                accept=".html,.json,.txt"
            >

            <p id="igLoadStatus" class="ig-muted">
                Aguardando a pasta do Instagram...
            </p>

            <div class="ig-layout">
                <aside class="ig-contacts">
                    <div class="ig-title">CONVERSAS</div>

                    <div id="igContactList" class="ig-contact-list">
                        <p class="ig-muted">Nenhuma conversa carregada.</p>
                    </div>
                </aside>

                <section class="ig-thread">
                    <div id="igConversationView">
                        <p class="ig-muted">
                            Clique em um contato para visualizar as mensagens.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    `);

    const folderInput = $("instagramExportFolder");
    const status = $("igLoadStatus");
    const contactList = $("igContactList");
    const conversationView = $("igConversationView");

    function cleanText(value) {
        return String(value || "")
            .replace(/\u00a0/g, " ")
            .replace(/\r/g, "")
            .trim();
    }

    function normalizePath(path) {
        let value = String(path || "")
            .replace(/\\/g, "/")
            .replace(/^\/+/, "")
            .toLowerCase();

        try {
            value = decodeURIComponent(value);
        } catch {
            // Conserva o caminho caso não seja possível decodificá-lo.
        }

        const rootMarker = "your_instagram_activity/";
        const rootPosition = value.indexOf(rootMarker);

        if (rootPosition >= 0) {
            return value.slice(rootPosition);
        }

        const inboxPosition = value.indexOf("messages/inbox/");

        if (inboxPosition >= 0) {
            return rootMarker + value.slice(inboxPosition);
        }

        return value;
    }

    function getPath(file) {
        return file.webkitRelativePath || file.name;
    }

    function parseConversationHTML(html) {
        const parsed = new DOMParser().parseFromString(
            html,
            "text/html"
        );

        const main = parsed.querySelector("main") || parsed.body;

        let blocks = Array.from(main.querySelectorAll("._a6-g"));

        blocks = blocks.filter(block =>
            !block.parentElement?.closest("._a6-g")
        );

        if (!blocks.length) {
            blocks = Array.from(main.children).filter(element =>
                element.querySelector("._a6-p") ||
                element.querySelector("._a6-l")
            );
        }

        const messages = [];

        for (const block of blocks) {
            const senderNode = block.querySelector(
                "._a6-h, h2, h3, ._a6-l"
            );

            const contentNode = block.querySelector(
                "._a6-p, blockquote"
            );

            const timeNode = block.querySelector(
                "time, ._a6-q"
            );

            let content = cleanText(
                contentNode?.innerText ||
                contentNode?.textContent ||
                ""
            );

            if (!content) {
                const copy = block.cloneNode(true);

                copy.querySelectorAll(
                    "h1,h2,h3,time,._a6-h,._a6-l,._a6-q"
                ).forEach(element => element.remove());

                content = cleanText(
                    copy.innerText || copy.textContent
                );
            }

            if (
                !content &&
                block.querySelector("img,video,audio")
            ) {
                content = "[Foto, vídeo ou mídia anexada]";
            }

            if (!content) continue;

            const sender = cleanText(
                senderNode?.innerText ||
                senderNode?.textContent ||
                "Remetente não identificado"
            );

            const time = cleanText(
                timeNode?.getAttribute("datetime") ||
                timeNode?.innerText ||
                timeNode?.textContent ||
                ""
            );

            messages.push({
                sender,
                content,
                time
            });
        }

        if (!messages.length) {
            const bodyText = cleanText(main.innerText || main.textContent);

            if (bodyText) {
                messages.push({
                    sender: "Exportação do Instagram",
                    content: bodyText,
                    time: ""
                });
            }
        }

        return messages;
    }

    function isOwnMessage(sender) {
        return /^(você|you)$/i.test(sender) ||
            /lucassilva\.?_?14|lucas eduardo freitas da silva/i.test(sender);
    }

    function renderConversation(name, messages) {
        conversationView.replaceChildren();

        const heading = document.createElement("div");
        heading.className = "ig-thread-heading";

        const title = document.createElement("strong");
        title.textContent = name;

        const count = document.createElement("div");
        count.className = "ig-muted";
        count.textContent = `${messages.length} mensagem(ns) encontradas`;

        heading.append(title, count);

        const list = document.createElement("div");
        list.className = "ig-message-list";

        if (!messages.length) {
            const empty = document.createElement("p");
            empty.className = "ig-muted";
            empty.textContent =
                "Não foram encontradas mensagens legíveis para esta conversa.";

            conversationView.append(heading, empty);
            return;
        }

        for (const message of messages) {
            const bubble = document.createElement("article");

            bubble.className = "ig-message" +
                (isOwnMessage(message.sender) ? " own" : "");

            const sender = document.createElement("div");
            sender.className = "ig-sender";
            sender.textContent = message.sender;

            const content = document.createElement("div");
            content.textContent = message.content;
            content.style.whiteSpace = "pre-wrap";

            bubble.append(sender, content);

            if (message.time) {
                const time = document.createElement("div");
                time.className = "ig-time";
                time.textContent = message.time;
                bubble.appendChild(time);
            }

            list.appendChild(bubble);
        }

        conversationView.append(heading, list);
        list.scrollTop = list.scrollHeight;
    }

    folderInput.addEventListener("change", async () => {
        const files = Array.from(folderInput.files || []);

        contactList.replaceChildren();
        conversationView.replaceChildren();

        if (!files.length) {
            status.textContent = "Nenhum arquivo selecionado.";
            return;
        }

        status.textContent = "Lendo a exportação do Instagram...";

        const chatsFile = files.find(file =>
            /(^|\/)chats\.html$/i.test(getPath(file))
        );

        if (!chatsFile) {
            status.textContent =
                "Não encontrei chats.html. Selecione a pasta completa da exportação.";

            return;
        }

        try {
            const html = await chatsFile.text();

            const indexDocument = new DOMParser().parseFromString(
                html,
                "text/html"
            );

            const anchors = Array.from(
                indexDocument.querySelectorAll("a[href]")
            ).filter(anchor =>
                /messages\/inbox\//i.test(
                    anchor.getAttribute("href") || ""
                )
            );

            const contacts = [];
            const seen = new Set();

            for (const anchor of anchors) {
                const name = cleanText(
                    anchor.innerText || anchor.textContent
                );

                const href = anchor.getAttribute("href") || "";

                if (!name || !href) continue;

                const target = normalizePath(href);
                const folder = target.slice(
                    0,
                    target.lastIndexOf("/") + 1
                );

                if (seen.has(folder)) continue;
                seen.add(folder);

                const messageFiles = files.filter(file => {
                    const path = normalizePath(getPath(file));

                    return path.startsWith(folder) &&
                        /^message_\d+\.html$/i.test(
                            path.slice(folder.length)
                        );
                });

                messageFiles.sort((a, b) => {
                    const getNumber = file => {
                        const match = getPath(file).match(
                            /message_(\d+)\.html$/i
                        );

                        return match ? Number(match[1]) : 0;
                    };

                    return getNumber(a) - getNumber(b);
                });

                contacts.push({
                    name,
                    files: messageFiles
                });
            }

            if (!contacts.length) {
                status.textContent = "Nenhuma conversa encontrada no índice.";
                return;
            }

            status.textContent =
                `${contacts.length} conversas encontradas. Clique em um nome.`;

            contacts.forEach((contact, index) => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "ig-contact";
                button.innerHTML =
                    `<span>✉</span><span>${escapeHTML(contact.name)}</span>`;

                button.addEventListener("click", async () => {
                    contactList.querySelectorAll(".ig-contact")
                        .forEach(item => item.classList.remove("active"));

                    button.classList.add("active");

                    if (!contact.files.length) {
                        renderConversation(contact.name, []);

                        const info = document.createElement("p");
                        info.className = "ig-muted";
                        info.textContent =
                            "Os arquivos message_1.html desta conversa não foram encontrados. Confira se toda a pasta foi extraída.";

                        conversationView.appendChild(info);
                        return;
                    }

                    conversationView.innerHTML =
                        '<p class="ig-muted">Carregando mensagens...</p>';

                    try {
                        const allMessages = [];

                        for (const file of contact.files) {
                            const fileHTML = await file.text();
                            const part = parseConversationHTML(fileHTML);

                            allMessages.push(...part);
                        }

                        renderConversation(contact.name, allMessages);
                    } catch (error) {
                        console.error(error);

                        conversationView.innerHTML =
                            '<p class="ig-muted">Não foi possível abrir esta conversa.</p>';
                    }
                });

                contactList.appendChild(button);

                if (index === 0) {
                    // O usuário ainda escolhe a conversa manualmente.
                }
            });
        } catch (error) {
            console.error("Erro ao importar mensagens:", error);

            status.textContent =
                "Não foi possível ler a exportação do Instagram.";
        }
    });
}

/* GPS */

function showGPS() {
    openModal("GPS / LOCALIZAÇÃO", `
        <div class="jarvis-tool">
            <p>Permita o acesso à localização para consultar coordenadas.</p>

            <button id="gpsButton">OBTER LOCALIZAÇÃO</button>

            <p id="gpsResult">Aguardando solicitação.</p>
        </div>
    `);

    $("gpsButton").addEventListener("click", () => {
        if (!navigator.geolocation) {
            $("gpsResult").textContent =
                "GPS indisponível neste ambiente.";

            return;
        }

        $("gpsResult").textContent = "Consultando localização...";

        navigator.geolocation.getCurrentPosition(
            position => {
                $("gpsResult").textContent =
                    `Latitude: ${position.coords.latitude.toFixed(6)}\n` +
                    `Longitude: ${position.coords.longitude.toFixed(6)}\n` +
                    `Precisão aproximada: ${Math.round(position.coords.accuracy)} m`;
            },
            () => {
                $("gpsResult").textContent =
                    "Localização negada ou indisponível.";
            },
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
    });
}

/* CLIMA */

function showWeather() {
    openModal("CLIMA", `
        <div class="jarvis-tool">
            <p>A previsão atual requer internet.</p>
            <button id="weatherButton">CONSULTAR PREVISÃO</button>
            <p id="weatherStatus"></p>
        </div>
    `);

    $("weatherButton").addEventListener("click", () => {
        if (!navigator.onLine) {
            $("weatherStatus").textContent = "Você está offline.";
            return;
        }

        window.open(
            "https://www.google.com/search?q=previs%C3%A3o+do+tempo",
            "_blank"
        );
    });
}

/* MÚSICA — PLAYLIST */

function showMusic() {
    openModal("CONTROLE DE MÚSICA", `
        <div class="jarvis-tool">
            <p>Selecione uma faixa para reproduzir.</p>

            <select id="musicTrackSelect">
                ${tracks.map((track, index) => `
                    <option value="${index}">
                        ${escapeHTML(track.title)}
                    </option>
                `).join("")}
            </select>

            <p id="musicStatus">Selecione uma faixa.</p>

            <button id="musicPlay">▶ REPRODUZIR / RETOMAR</button>
            <button id="musicPause">⏸ PAUSAR</button>
            <button id="musicNext">⏭ PRÓXIMA MÚSICA</button>
        </div>
    `);

    const select = $("musicTrackSelect");
    const status = $("musicStatus");

    select.value = String(musicIndex);

    function playTrack(index = musicIndex) {
        musicIndex = (index + tracks.length) % tracks.length;

        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.onended = null;
            audioPlayer.onerror = null;
        }

        const track = tracks[musicIndex];

        select.value = String(musicIndex);
        audioPlayer = new Audio(track.file);

        status.textContent = `Reproduzindo: ${track.title}`;

        audioPlayer.onended = () => {
            status.textContent = `Finalizada: ${track.title}`;
        };

        audioPlayer.onerror = () => {
            status.textContent =
                `Não foi possível tocar "${track.title}". Confira o arquivo ${track.file}.`;
        };

        audioPlayer.play().catch(() => {
            status.textContent =
                `Não foi possível tocar "${track.title}". Confira o arquivo ${track.file}.`;
        });
    }

    select.addEventListener("change", () => {
        playTrack(Number(select.value));
    });

    $("musicPlay").addEventListener("click", () => {
        if (!audioPlayer || audioPlayer.ended) {
            playTrack(musicIndex);
            return;
        }

        if (audioPlayer.paused) {
            audioPlayer.play().catch(() => {
                status.textContent = "Não foi possível retomar a reprodução.";
            });
        }
    });

    $("musicPause").addEventListener("click", () => {
        if (!audioPlayer) return;

        audioPlayer.pause();

        status.textContent =
            `Pausada: ${tracks[musicIndex].title}`;
    });

    $("musicNext").addEventListener("click", () => {
        playTrack((musicIndex + 1) % tracks.length);
    });
}

/* PROBABILIDADE E ESTATÍSTICAS */

function showStats() {
    openModal("PROBABILIDADE E ESTATÍSTICAS", `
        <div class="jarvis-tool">
            <input id="statsTotal" type="number" placeholder="Valor total">
            <input id="statsPercent" type="number" placeholder="Porcentagem (%)">

            <button id="statsButton">CALCULAR</button>

            <div id="statsResult" class="tool-result">
                Resultado: —
            </div>
        </div>
    `);

    $("statsButton").addEventListener("click", () => {
        const total = Number($("statsTotal").value);
        const percent = Number($("statsPercent").value);

        if (
            $("statsTotal").value === "" ||
            $("statsPercent").value === "" ||
            !Number.isFinite(total) ||
            !Number.isFinite(percent)
        ) {
            $("statsResult").textContent = "Digite números válidos.";
            return;
        }

        $("statsResult").textContent =
            `Resultado: ${(total * percent / 100).toLocaleString("pt-BR")}`;
    });
}

/* TABELAS ESPORTIVAS */

function showSports() {
    openModal("TABELAS ESPORTIVAS", `
        <div class="jarvis-tool">
            <p>As tabelas atuais precisam de internet.</p>

            <button id="sportsButton">CONSULTAR TABELAS</button>

            <p id="sportsStatus"></p>
        </div>
    `);

    $("sportsButton").addEventListener("click", () => {
        if (!navigator.onLine) {
            $("sportsStatus").textContent =
                "As tabelas atuais não estão disponíveis offline.";

            return;
        }

        window.open(
            "https://www.google.com/search?q=tabelas+de+futebol",
            "_blank"
        );
    });
}

/* LIGAÇÕES */

function showCalls() {
    openModal("LIGAÇÕES", `
        <div class="jarvis-tool">
            <p>
                As ligações dependem de um aplicativo ou serviço compatível.
                Esta interface não realiza chamadas por conta própria.
            </p>
        </div>
    `);
}

/* PESQUISA NA WEB */

async function searchWeb(query) {
    if (!navigator.onLine) {
        respond(
            "Senhor, estou offline. A pesquisa na web precisa de internet.",
            false
        );

        return;
    }

    if (
        window.jarvis &&
        typeof window.jarvis.research === "function"
    ) {
        respond("Iniciando pesquisa...", false);

        try {
            const result = await window.jarvis.research(query);

            respond(
                typeof result === "string"
                    ? result
                    : result?.answer || "Nenhum resultado retornado."
            );
        } catch (error) {
            console.error(error);

            respond(
                "Não foi possível concluir a pesquisa. Verifique sua conexão."
            );
        }

        return;
    }

    window.open(
        "https://www.google.com/search?q=" +
        encodeURIComponent(query),
        "_blank"
    );

    respond("Abri a pesquisa no navegador.", false);
}

/* COMANDOS DE TEXTO */

async function executeCommand(command) {
    const original = command.trim();

    if (!original) return;

    const cmd = original
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    addMessage(original, "user-message");

    if (userInput) {
        userInput.value = "";
    }

    if (/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(cmd)) {
        respond("Olá, senhor. Como posso ajudá-lo?");
        return;
    }

    if (
        cmd.includes("que horas") ||
        cmd === "hora" ||
        cmd === "horario"
    ) {
        respond(
            "Senhor, agora são " +
            new Date().toLocaleTimeString("pt-BR")
        );

        return;
    }

    if (
        cmd === "data" ||
        cmd.includes("data de hoje") ||
        cmd.includes("que dia e hoje")
    ) {
        respond(
            "Hoje é " +
            new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            })
        );

        return;
    }

    if (cmd.includes("ajuda") || cmd.includes("comandos")) {
        respond(
            "Posso informar hora e data, abrir ferramentas locais, " +
            "usar a câmera, acessar a galeria e pesquisar na web quando houver internet."
        );

        return;
    }

    if (cmd.includes("limpar conversa") || cmd.includes("limpar tela")) {
        if (chat) {
            chat.innerHTML = "";
        }

        respond("Conversa limpa.");
        return;
    }

    if (
        cmd.startsWith("pesquise ") ||
        cmd.startsWith("pesquisar ") ||
        cmd.startsWith("procure ") ||
        cmd.startsWith("buscar ")
    ) {
        await searchWeb(
            original.replace(
                /^(pesquise|pesquisar|procure|buscar)\s+/i,
                ""
            )
        );

        return;
    }

    if (cmd.includes("abrir google")) {
        if (navigator.onLine) {
            window.open("https://www.google.com", "_blank");
        } else {
            respond("O Google precisa de internet.", false);
        }

        return;
    }

    if (cmd.includes("abrir youtube")) {
        if (navigator.onLine) {
            window.open("https://www.youtube.com", "_blank");
        } else {
            respond("O YouTube precisa de internet.", false);
        }

        return;
    }

    if (cmd.includes("abrir instagram")) {
        if (navigator.onLine) {
            window.open("https://www.instagram.com/", "_blank");
        } else {
            respond("O Instagram precisa de internet.", false);
        }

        return;
    }

    if (
        cmd.includes("mensagens recentes") ||
        cmd.includes("abrir mensagens") ||
        cmd.includes("mensagens do instagram")
    ) {
        showRecentMessages();
        return;
    }

    if (
        cmd.includes("abrir galeria") ||
        cmd === "galeria" ||
        cmd.includes("minhas fotos")
    ) {
        showGallery();
        return;
    }

    if (
        cmd.includes("abrir camera") ||
        cmd.includes("abrir câmera") ||
        cmd === "camera" ||
        cmd === "câmera"
    ) {
        showCamera();
        return;
    }

    if (cmd.includes("dicionario")) return showDictionary();
    if (cmd.includes("calculadora")) return showCalculator();

    if (
        cmd.includes("bloco de notas") ||
        cmd.includes("anotacoes")
    ) {
        return showNotes();
    }

    if (cmd.includes("calendario")) return showCalendar();
    if (cmd.includes("cronometro")) return showStopwatch();
    if (cmd.includes("alarme")) return showAlarm();
    if (cmd.includes("agua")) return showWater();

    if (cmd.includes("clima") || cmd.includes("previsao")) {
        return showWeather();
    }

    if (cmd.includes("gps") || cmd.includes("localizacao")) {
        return showGPS();
    }

    if (cmd.includes("musica") || cmd.includes("playlist")) {
        return showMusic();
    }

    if (
        cmd.includes("estatistica") ||
        cmd.includes("probabilidade")
    ) {
        return showStats();
    }

    if (
        cmd.includes("tabela esportiva") ||
        cmd.includes("tabela de futebol")
    ) {
        return showSports();
    }

    respond(
        `Comando "${original}" recebido. Essa função ainda não está configurada.`
    );
}

/* BOTÃO ENVIAR E ENTER */

sendButton?.addEventListener("click", () => {
    executeCommand(userInput?.value || "");
});

userInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        executeCommand(userInput.value);
    }
});

/* RECONHECIMENTO DE VOZ */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition && micButton) {
    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        if (voiceStatus) {
            voiceStatus.textContent = "MICROFONE ATIVO • OUVINDO";
        }
    };

    recognition.onresult = event => {
        if (userInput) {
            userInput.value = event.results[0][0].transcript;
            executeCommand(userInput.value);
        }
    };

    recognition.onerror = () => {
        if (voiceStatus) {
            voiceStatus.textContent = "VOZ INDISPONÍVEL";
        }

        showToast("Não foi possível usar o microfone.");
    };

    recognition.onend = () => {
        if (voiceStatus) {
            voiceStatus.textContent = navigator.onLine
                ? "VOICE ONLINE • READY"
                : "VOICE • MODO OFFLINE";
        }
    };

    micButton.addEventListener("click", () => {
        try {
            recognition.start();
        } catch {
            showToast("Microfone já está ativo.");
        }
    });
} else if (micButton) {
    micButton.addEventListener("click", () => {
        showToast(
            "Reconhecimento de voz indisponível neste navegador."
        );
    });
}

/* CLIQUES DOS ITENS DO MENU */

document.querySelectorAll(".menu-item[data-action]").forEach(button => {
    button.addEventListener("click", () => {
        hideMenu();

        switch (button.dataset.action) {
            case "alarm":
                return showAlarm();

            case "notes":
                return showNotes();

            case "calculator":
                return showCalculator();

            case "calendar":
                return showCalendar();

            case "camera":
                return showCamera();

            case "gallery":
                return showGallery();

            case "weather":
                return showWeather();

            case "stopwatch":
                return showStopwatch();

            case "dictionary":
                return showDictionary();

            case "messages":
                return showRecentMessages();

            case "call":
                return showCalls();

            case "water":
                return showWater();

            case "music":
                return showMusic();

            case "stats":
                return showStats();

            case "sports":
                return showSports();

            case "gps":
                return showGPS();

            default:
                return showToast("Função não configurada.");
        }
    });
});

/* BOTÃO DE MENSAGENS RECENTES */

$("recentMessagesButton")?.addEventListener(
    "click",
    showRecentMessages
);

/* INICIALIZAÇÃO */

window.addEventListener("load", () => {
    updateClock();
    updateNetworkStatus();

    if (voiceStatus) {
        voiceStatus.textContent = navigator.onLine
            ? "VOICE ONLINE • READY"
            : "VOICE • MODO OFFLINE";
    }

    console.log("J.A.R.V.I.S. iniciado.");
});