// Stray Animal Care Platform - Core Javascript Logic

// --- SEED DATA (預設初始資料) ---
const INITIAL_REPORTS = [
    {
        id: "rep-1",
        type: "dog",
        count: 1,
        status: "觀察中",
        address: "大安森林公園 - 露天音樂台旁草皮",
        lat: 25.0315,
        lng: 121.5350,
        photo: "images/stray_dog_1.png",
        desc: "一隻非常溫馴的棕色中型犬，耳朵是立起來的，脖子上有戴著綠色防蚤項圈。看到人會友善地搖尾巴，似乎對人很有信任感。常在草地上出沒曬太陽，由公園遊客定期餵食。",
        date: "2026-06-01"
    },
    {
        id: "rep-2",
        type: "cat",
        count: 1,
        status: "待救援",
        address: "台北市永康街商圈 - 15巷內巷口",
        lat: 25.0310,
        lng: 121.5298,
        photo: "images/stray_cat_1.png",
        desc: "橘色虎斑貓，右耳已經剪耳（代表已結紮）。但今天下午發現牠的左後腳受傷流血，走起路來一拐一拐的，眼神看起來很驚恐，警戒心高。需要動保團體協助帶去就醫安置。",
        date: "2026-06-02"
    },
    {
        id: "rep-3",
        type: "dog",
        count: 2,
        status: "觀察中",
        address: "台灣大學校總區 - 總圖書館旁椰林大道",
        lat: 25.0175,
        lng: 121.5405,
        photo: "images/stray_dog_2.png",
        desc: "兩隻毛色黑亮的中型黑狗（小黑與大黑），結伴同行。看到人稍微有些防備，但給食物會乖乖坐下。身上看起來滿乾淨的，疑似有附近愛心志工固定進行TNR與餵養。",
        date: "2026-05-30"
    },
    {
        id: "rep-4",
        type: "cat",
        count: 1,
        status: "已救援",
        address: "大安區和平東路二段 - 118巷弄內",
        lat: 25.0258,
        lng: 121.5435,
        photo: "images/stray_cat_2.png",
        desc: "超親人的三花貓，會一直對著路人喵喵叫撒嬌，還會主動蹭人討摸。因為親人且常穿梭在馬路邊很危險，已被附近咖啡店老闆暫時安置在店內，正尋找認養人中，且已完成結紮。",
        date: "2026-06-02"
    }
];

// --- GLOBAL VARIABLES ---
let reports = [];
let mainMap = null;
let selectionMap = null;
let mainMapMarkers = [];
let selectionMarker = null;

// Form image handling variables
let customPhotoBase64 = null;

// Default map view settings (Center on Daan District, Taipei)
const MAP_DEFAULT_CENTER = [25.0270, 121.5380];
const MAP_DEFAULT_ZOOM = 14;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Lucide Icons
    lucide.createIcons();
    
    // 2. Load data from LocalStorage or seed data
    loadReportsData();
    
    // 3. Initialize views & event listeners
    initNavigation();
    initMaps();
    initReportForm();
    initFilters();
    
    // 4. Update UI Displays (Stats, Gallery, Map Markers)
    updateAllViews();
});

// --- DATA PERSISTENCE ---
function loadReportsData() {
    const stored = localStorage.getItem("stray_reports");
    if (stored) {
        reports = JSON.parse(stored);
    } else {
        reports = [...INITIAL_REPORTS];
        saveReportsToStorage();
    }
}

function saveReportsToStorage() {
    localStorage.setItem("stray_reports", JSON.stringify(reports));
}

// --- NAVIGATION SYSTEM ---
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetSectionId = item.getAttribute("data-target");
            switchSection(targetSectionId);
        });
    });

    // Support back/forward browser navigation
    window.addEventListener("hashchange", () => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetSection = document.getElementById(`${hash}-section`);
            if (targetSection) {
                switchSection(`${hash}-section`);
            }
        }
    });

    // Direct link routing on load
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1) + "-section";
        if (document.getElementById(targetId)) {
            switchSection(targetId);
        }
    }
}

function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll(".content-section").forEach(sec => {
        sec.classList.remove("active");
    });
    
    // Show target section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add("active");
    }
    
    // Update active nav state
    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.getAttribute("data-target") === sectionId) {
            item.classList.add("active");
            // Set window hash without triggering reload
            const hash = sectionId.replace("-section", "");
            window.location.hash = hash;
        } else {
            item.classList.remove("active");
        }
    });

    // Correct Leaflet maps size bugs when toggled from hidden to visible
    if (sectionId === "map-section" && mainMap) {
        setTimeout(() => {
            mainMap.invalidateSize();
        }, 100);
    } else if (sectionId === "report-section" && selectionMap) {
        setTimeout(() => {
            selectionMap.invalidateSize();
            // Automatically center selection map marker if not set
            if (!selectionMarker) {
                setDefaultSelectionMarker();
            }
        }, 100);
    }
}

// --- MAPS MANAGEMENT ---
function initMaps() {
    // Initialize Main Interactive Map
    mainMap = L.map("main-map", {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mainMap);

    // Initialize Selection Map for Reporting
    selectionMap = L.map("selection-map", {
        zoomControl: true
    }).setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(selectionMap);

    // Click event on Selection Map to set coordinates
    selectionMap.on("click", (e) => {
        setSelectionCoordinates(e.latlng.lat, e.latlng.lng);
    });
}

function setDefaultSelectionMarker() {
    const lat = MAP_DEFAULT_CENTER[0];
    const lng = MAP_DEFAULT_CENTER[1];
    setSelectionCoordinates(lat, lng);
}

function setSelectionCoordinates(lat, lng) {
    document.getElementById("report-lat").value = lat.toFixed(6);
    document.getElementById("report-lng").value = lng.toFixed(6);

    if (selectionMarker) {
        selectionMarker.setLatLng([lat, lng]);
    } else {
        const customIcon = L.divIcon({
            html: `<div class="marker-pin dog"><i data-lucide="map-pin" style="color:white;transform:rotate(45deg);"></i></div>`,
            className: "custom-map-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        selectionMarker = L.marker([lat, lng], { 
            draggable: true,
            icon: customIcon
        }).addTo(selectionMap);
        
        lucide.createIcons();

        selectionMarker.on("dragend", function(event) {
            const marker = event.target;
            const position = marker.getLatLng();
            document.getElementById("report-lat").value = position.lat.toFixed(6);
            document.getElementById("report-lng").value = position.lng.toFixed(6);
        });
    }
    selectionMap.panTo([lat, lng]);
}

// Draw/Redraw all markers on Main Map based on filters
function drawMainMapMarkers(filteredData = reports) {
    // Clear old markers
    mainMapMarkers.forEach(m => mainMap.removeLayer(m));
    mainMapMarkers = [];

    filteredData.forEach(item => {
        // Create custom divIcon for cats vs dogs
        const iconColorClass = item.type === "dog" ? "dog" : "cat";
        const iconName = item.type === "dog" ? "dog" : "cat";
        
        const customIcon = L.divIcon({
            html: `<div class="marker-pin ${iconColorClass}"><i data-lucide="${iconName}"></i></div>`,
            className: "custom-map-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(mainMap);
        
        // Popup content layout
        const statusBadgeClass = getStatusClass(item.status);
        const popupHTML = `
            <div class="map-popup-card" onclick="openDetailModal('${item.id}')" style="cursor:pointer;">
                <img src="${item.photo}" class="map-popup-img" alt="Animal Pic">
                <div class="map-popup-body">
                    <div class="map-popup-title">${item.type === "dog" ? "🐶 汪汪" : "🐱 喵喵"} · ${item.address.split(" - ")[0]}</div>
                    <div class="map-popup-desc">${item.desc}</div>
                    <div class="map-popup-footer">
                        <span class="badge ${statusBadgeClass}">${item.status}</span>
                        <span class="map-popup-qty">數量: ${item.count}隻</span>
                    </div>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupHTML, {
            maxWidth: 240,
            closeButton: true
        });

        mainMapMarkers.push(marker);
    });

    // Re-trigger icon rendering
    lucide.createIcons();
}

function getStatusClass(status) {
    if (status === "待救援") return "pending";
    if (status === "觀察中") return "monitoring";
    return "rescued";
}

// --- REPORT FORM LOGIC ---
function initReportForm() {
    const qtyMinus = document.getElementById("qty-minus");
    const qtyPlus = document.getElementById("qty-plus");
    const qtyInput = document.getElementById("animal-count");
    
    qtyMinus.addEventListener("click", () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
    });

    qtyPlus.addEventListener("click", () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val < 20) qtyInput.value = val + 1;
    });

    // Picture upload simulation
    const fileInput = document.getElementById("custom-photo-file");
    const radioUpload = document.getElementById("radio-upload-trigger");
    const uploadTrigger = document.querySelector(".upload-trigger");
    const previewContainer = document.getElementById("upload-preview-container");
    const previewImg = document.getElementById("upload-preview-img");
    const btnClearUploaded = document.getElementById("btn-clear-uploaded");

    uploadTrigger.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                customPhotoBase64 = event.target.result;
                previewImg.src = customPhotoBase64;
                previewContainer.classList.remove("hidden");
                // Select the upload radio button
                radioUpload.checked = true;
            };
            reader.readAsDataURL(file);
        }
    });

    btnClearUploaded.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.value = "";
        customPhotoBase64 = null;
        previewContainer.classList.add("hidden");
        // Reset selection back to default photo preset
        document.querySelector('input[name="preset-photo"][value="images/stray_dog_1.png"]').checked = true;
    });

    // Handle Form Submit
    const form = document.getElementById("report-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="animal-type"]:checked').value;
        const count = parseInt(qtyInput.value) || 1;
        const status = document.getElementById("animal-status").value;
        const lat = parseFloat(document.getElementById("report-lat").value);
        const lng = parseFloat(document.getElementById("report-lng").value);
        const address = document.getElementById("report-address").value.trim();
        const desc = document.getElementById("animal-desc").value.trim() || "無詳細特徵說明。";

        if (isNaN(lat) || isNaN(lng)) {
            showToast("請在地圖上標記一個點作為位置！", "danger");
            return;
        }

        // Get Photo: preset URL or base64 upload
        const photoRadio = document.querySelector('input[name="preset-photo"]:checked').value;
        let photoPath = photoRadio;
        if (photoRadio === "upload") {
            if (!customPhotoBase64) {
                showToast("您選擇了上傳照片，請點選框框選擇一個檔案！", "danger");
                return;
            }
            photoPath = customPhotoBase64;
        }

        // Build report object
        const newReport = {
            id: "rep-" + Date.now(),
            type: type,
            count: count,
            status: status,
            address: address,
            lat: lat,
            lng: lng,
            photo: photoPath,
            desc: desc,
            date: new Date().toISOString().split("T")[0]
        };

        // Add to array, save and update UI
        reports.unshift(newReport); // Adds to front
        saveReportsToStorage();
        updateAllViews();
        
        // Reset form & states
        form.reset();
        qtyInput.value = "1";
        customPhotoBase64 = null;
        previewContainer.classList.add("hidden");
        if (selectionMarker) {
            selectionMap.removeLayer(selectionMarker);
            selectionMarker = null;
        }
        setDefaultSelectionMarker();

        showToast("通報成功！已成功上架至地圖與清單中。", "success");
        
        // Redirect back to map view to see the new pin
        setTimeout(() => {
            switchSection("map-section");
            // Highlight/pan to the new marker
            mainMap.setView([lat, lng], 16);
        }, 1000);
    });
}

// --- FILTER & SEARCH SYSTEM ---
function initFilters() {
    // Map Filter listeners
    document.getElementById("map-filter-type").addEventListener("change", applyFilters);
    document.getElementById("map-filter-status").addEventListener("change", applyFilters);

    // Gallery search
    document.getElementById("gallery-search").addEventListener("input", applyFilters);

    // Gallery filter buttons
    const typeFilters = document.querySelectorAll("#filter-type-group .filter-btn");
    typeFilters.forEach(btn => {
        btn.addEventListener("click", () => {
            typeFilters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
        });
    });

    const statusFilters = document.querySelectorAll("#filter-status-group .filter-btn");
    statusFilters.forEach(btn => {
        btn.addEventListener("click", () => {
            statusFilters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilters();
        });
    });
}

function applyFilters() {
    // Get active values for Map Filters
    const mapType = document.getElementById("map-filter-type").value;
    const mapStatus = document.getElementById("map-filter-status").value;

    // Get active values for Gallery Filters
    const gallerySearch = document.getElementById("gallery-search").value.toLowerCase();
    const activeGalleryTypeBtn = document.querySelector("#filter-type-group .filter-btn.active");
    const galleryType = activeGalleryTypeBtn ? activeGalleryTypeBtn.getAttribute("data-filter-type") : "all";
    
    const activeGalleryStatusBtn = document.querySelector("#filter-status-group .filter-btn.active");
    const galleryStatus = activeGalleryStatusBtn ? activeGalleryStatusBtn.getAttribute("data-filter-status") : "all";

    // 1. Process Map Filtering
    const mapFiltered = reports.filter(item => {
        const typeMatch = (mapType === "all" || item.type === mapType);
        const statusMatch = (mapStatus === "all" || item.status === mapStatus);
        return typeMatch && statusMatch;
    });
    drawMainMapMarkers(mapFiltered);
    updateMapSidebarList(mapFiltered);

    // 2. Process Gallery Filtering
    const galleryFiltered = reports.filter(item => {
        const typeMatch = (galleryType === "all" || item.type === galleryType);
        const statusMatch = (galleryStatus === "all" || item.status === galleryStatus);
        const searchMatch = (
            item.address.toLowerCase().includes(gallerySearch) ||
            item.desc.toLowerCase().includes(gallerySearch)
        );
        return typeMatch && statusMatch && searchMatch;
    });

    renderGallery(galleryFiltered);
}

// --- UI UPDATING & RENDERING ---
function updateAllViews() {
    updateStatistics();
    
    // Trigger initial filters processing which will draw map and gallery
    applyFilters();
    
    renderRecentReportsList();
}

function updateStatistics() {
    const totalCount = reports.length;
    const dogCount = reports.filter(r => r.type === "dog").reduce((acc, curr) => acc + curr.count, 0);
    const catCount = reports.filter(r => r.type === "cat").reduce((acc, curr) => acc + curr.count, 0);
    
    // Status counts based on item count, not just card count
    const pending = reports.filter(r => r.status === "待救援").reduce((acc, curr) => acc + curr.count, 0);
    const monitoring = reports.filter(r => r.status === "觀察中").reduce((acc, curr) => acc + curr.count, 0);
    const rescued = reports.filter(r => r.status === "已救援").reduce((acc, curr) => acc + curr.count, 0);
    
    const totalAnimalSum = pending + monitoring + rescued;

    // Set text elements
    document.getElementById("stat-total").innerText = totalCount;
    document.getElementById("stat-dogs").innerText = dogCount;
    document.getElementById("stat-cats").innerText = catCount;
    document.getElementById("stat-rescued").innerText = rescued;

    // Rescue rate percentage calculation
    const rate = totalAnimalSum > 0 ? Math.round((rescued / totalAnimalSum) * 100) : 0;
    document.getElementById("stat-rescue-rate").innerText = `安置率: ${rate}%`;

    // Render CSS Conic Pie Chart dynamically
    const pieChart = document.getElementById("status-pie-chart");
    const centerVal = document.getElementById("chart-center-val");
    centerVal.innerText = totalAnimalSum;

    if (totalAnimalSum > 0) {
        const pendingPct = (pending / totalAnimalSum) * 100;
        const monitoringPct = (monitoring / totalAnimalSum) * 100;
        const rescuedPct = (rescued / totalAnimalSum) * 100;

        pieChart.style.background = `conic-gradient(
            var(--warning) 0% ${pendingPct}%, 
            var(--secondary) ${pendingPct}% ${pendingPct + monitoringPct}%, 
            var(--success) ${pendingPct + monitoringPct}% 100%
        )`;
    } else {
        pieChart.style.background = `#cbd5e1`; // default gray
    }

    // Legend values
    document.getElementById("legend-pending-count").innerText = `${pending} 隻`;
    document.getElementById("legend-monitoring-count").innerText = `${monitoring} 隻`;
    document.getElementById("legend-rescued-count").innerText = `${rescued} 隻`;
}

function renderRecentReportsList() {
    const container = document.getElementById("recent-reports-container");
    container.innerHTML = "";
    
    // Take latest 3 reports
    const recents = reports.slice(0, 3);
    
    if (recents.length === 0) {
        container.innerHTML = `<div class="recent-item" style="justify-content:center;color:var(--text-muted);">目前無最新通報</div>`;
        return;
    }

    recents.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "recent-item";
        itemDiv.setAttribute("onclick", `openDetailModal('${item.id}')`);
        
        const statusBadgeClass = getStatusClass(item.status);
        const nameType = item.type === "dog" ? "狗" : "貓";

        itemDiv.innerHTML = `
            <img src="${item.photo}" class="recent-thumb" alt="Thumb">
            <div class="recent-details">
                <h4>${nameType} · ${item.address.split(" - ")[0]}</h4>
                <p>${item.desc}</p>
            </div>
            <div class="recent-meta">
                <span class="badge ${statusBadgeClass}">${item.status}</span>
                <span class="recent-time">${item.date}</span>
            </div>
        `;
        
        container.appendChild(itemDiv);
    });
}

function updateMapSidebarList(data) {
    const container = document.getElementById("map-sidebar-list-container");
    const countSpan = document.getElementById("map-sidebar-count");
    
    container.innerHTML = "";
    countSpan.innerText = data.length;

    if (data.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-light);font-size:0.85rem;">此範圍內無毛孩</div>`;
        return;
    }

    data.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "map-sidebar-item";
        
        const statusBadgeClass = getStatusClass(item.status);
        const nameType = item.type === "dog" ? "狗狗" : "貓咪";

        itemDiv.innerHTML = `
            <img src="${item.photo}" class="map-sidebar-img" alt="Img">
            <div class="map-sidebar-info">
                <h4 class="map-sidebar-title">${nameType} · ${item.address}</h4>
                <p class="map-sidebar-desc">${item.desc}</p>
                <div class="map-sidebar-meta">
                    <span class="badge ${statusBadgeClass}">${item.status}</span>
                    <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);">數量: ${item.count}隻</span>
                </div>
            </div>
        `;

        itemDiv.addEventListener("click", () => {
            // Highlighting side bar element
            document.querySelectorAll(".map-sidebar-item").forEach(s => s.classList.remove("selected"));
            itemDiv.classList.add("selected");

            // Move main map viewport and popup marker
            mainMap.setView([item.lat, item.lng], 16);
            
            // Find marker match and pop it open
            const targetMarker = mainMapMarkers.find(m => {
                const pos = m.getLatLng();
                return pos.lat === item.lat && pos.lng === item.lng;
            });
            if (targetMarker) {
                targetMarker.openPopup();
            }
        });

        container.appendChild(itemDiv);
    });
}

function renderGallery(data) {
    const container = document.getElementById("gallery-cards-container");
    const emptyState = document.getElementById("gallery-empty-state");
    
    container.innerHTML = "";

    if (data.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }
    emptyState.classList.add("hidden");

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "gallery-card";
        card.setAttribute("onclick", `openDetailModal('${item.id}')`);
        
        const statusBadgeClass = getStatusClass(item.status);
        const speciesLabel = item.type === "dog" ? "狗狗" : "貓咪";
        const speciesClass = item.type === "dog" ? "dog-badge" : "cat-badge";

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${item.photo}" class="card-img" alt="Stray Animal Photo">
                <div class="card-overlay-badges">
                    <span class="badge ${statusBadgeClass}">${item.status}</span>
                    <span class="badge ${speciesClass}">${speciesLabel}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-body-top">
                    <h3 class="card-title">${item.address.split(" - ")[0]}</h3>
                    <span class="card-qty-badge">數量: ${item.count}隻</span>
                </div>
                <p class="card-desc">${item.desc}</p>
                <div class="card-footer">
                    <div class="card-loc">
                        <i data-lucide="map-pin"></i>
                        <span>${item.address.split(" - ").pop()}</span>
                    </div>
                    <div class="card-time">
                        <i data-lucide="calendar"></i>
                        <span>${item.date}</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });

    lucide.createIcons();
}

// --- DETAIL MODAL CONTROL ---
window.openDetailModal = function(id) {
    const item = reports.find(r => r.id === id);
    if (!item) return;

    // Fill Modal Data
    document.getElementById("modal-img").src = item.photo;
    
    const speciesBadge = document.getElementById("modal-species-badge");
    speciesBadge.innerText = item.type === "dog" ? "🐶 狗狗" : "🐱 貓咪";
    speciesBadge.className = `badge ${item.type === "dog" ? "dog-badge" : "cat-badge"}`;

    const statusBadge = document.getElementById("modal-status-badge");
    statusBadge.innerText = item.status;
    statusBadge.className = `badge ${getStatusClass(item.status)}`;

    document.getElementById("modal-title").innerText = item.address;
    document.getElementById("modal-time-text").innerHTML = `<i data-lucide="calendar"></i> 通報時間：${item.date}`;
    document.getElementById("modal-count-text").innerText = `${item.count} 隻`;
    document.getElementById("modal-coords-text").innerText = `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
    document.getElementById("modal-desc-text").innerText = item.desc;

    // Actions setup
    const locateBtn = document.getElementById("modal-locate-btn");
    locateBtn.onclick = () => {
        closeDetailModal();
        switchSection("map-section");
        mainMap.setView([item.lat, item.lng], 16);
        
        // Open target popup
        const marker = mainMapMarkers.find(m => {
            const pos = m.getLatLng();
            return pos.lat === item.lat && pos.lng === item.lng;
        });
        if (marker) {
            setTimeout(() => marker.openPopup(), 400);
        }
    };

    const statusBtn = document.getElementById("modal-status-toggle-btn");
    if (item.status === "已救援") {
        statusBtn.innerHTML = `<i data-lucide="alert-circle"></i> 更改為觀察中`;
        statusBtn.onclick = () => {
            updateReportStatus(id, "觀察中");
            closeDetailModal();
        };
    } else {
        statusBtn.innerHTML = `<i data-lucide="check-circle"></i> 更新為已安置`;
        statusBtn.onclick = () => {
            updateReportStatus(id, "已救援");
            closeDetailModal();
        };
    }

    // Open Modal
    const backdrop = document.getElementById("detail-modal");
    backdrop.classList.remove("hidden");
    setTimeout(() => {
        backdrop.classList.add("show");
    }, 10);
    
    // Bind close event once
    document.getElementById("modal-close-btn").onclick = closeDetailModal;
    backdrop.onclick = (e) => {
        if (e.target === backdrop) closeDetailModal();
    };

    lucide.createIcons();
};

function closeDetailModal() {
    const backdrop = document.getElementById("detail-modal");
    backdrop.classList.remove("show");
    setTimeout(() => {
        backdrop.classList.add("hidden");
    }, 300);
}

function updateReportStatus(id, newStatus) {
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
        reports[index].status = newStatus;
        saveReportsToStorage();
        updateAllViews();
        showToast(`成功更新通報狀態為：${newStatus}`, "success");
    }
}

// --- UTILITIES ---
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const msgSpan = document.getElementById("toast-msg");
    const icon = document.getElementById("toast-icon");

    msgSpan.innerText = message;
    toast.className = `toast show ${type}`;

    if (type === "success") {
        icon.setAttribute("data-lucide", "check-circle");
    } else if (type === "danger") {
        icon.setAttribute("data-lucide", "alert-triangle");
    } else {
        icon.setAttribute("data-lucide", "info");
    }

    lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
