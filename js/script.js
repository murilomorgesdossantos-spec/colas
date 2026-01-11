// --- CONFIGURAÇÃO GLOBAL ---
const API_URL = 'https://script.google.com/macros/s/AKfycbzasoaug_hPyhixg6QheptfkbBCg_HxF07ChjJ9xp_znA0MRfLeEeNWTbTxbZcos93p/exec';

// --- SISTEMA DE NOTIFICAÇÕES (TOAST) ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fas fa-info-circle" style="color:var(--text-muted)"></i>';
    if(type === 'success') icon = '<i class="fas fa-check-circle" style="color:var(--primary)"></i>';
    if(type === 'error') icon = '<i class="fas fa-exclamation-circle" style="color:var(--danger)"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Remove após 4 segundos
    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
    }, 4000);
}

// --- GUARDA DE ROTAS ---
(function() {
    const user = localStorage.getItem('username');
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    const publicPages = ['index.html', 'login.html', 'cadastro.html', '', 'index'];

    if (!publicPages.includes(page) && !user) window.location.href = 'index.html';
    if ((page === 'login.html' || page === 'cadastro.html') && user) window.location.href = 'dashboard.html';
})();

document.addEventListener('DOMContentLoaded', () => {

    async function postData(bodyData) {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(bodyData)
        });
        return await response.json();
    }

    // --- ADMIN CHECK ---
    const btnAdmin = document.getElementById('btnAdminUpload');
    if (btnAdmin) {
        if (localStorage.getItem('isAdmin') === 'true') {
            btnAdmin.style.display = 'flex';
            fetch('subjects.json').then(res => res.json()).then(data => {
                window.allSubjectsData = data;
                updateUploadSubjects();
            });
        }
    }

    // --- LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('userLogin').value;
            const pass = document.getElementById('passLogin').value;
            const btnSubmit = loginForm.querySelector('button');
            
            btnSubmit.innerText = "Verificando...";
            btnSubmit.disabled = true;

            postData({ action: 'login', user: user, pass: pass })
            .then(data => {
                if (data.status === 'success') {
                    showToast('Login realizado com sucesso!', 'success');
                    localStorage.setItem('userPermissions', JSON.stringify(data.permissions));
                    localStorage.setItem('username', user);
                    localStorage.setItem('isAdmin', data.isAdmin);
                    setTimeout(() => window.location.href = 'dashboard.html', 1000); 
                } else { 
                    showToast(data.message, 'error'); 
                    btnSubmit.innerText = "Entrar"; btnSubmit.disabled = false;
                }
            })
            .catch(() => {
                showToast('Erro de conexão com o servidor.', 'error');
                btnSubmit.innerText = "Entrar"; btnSubmit.disabled = false;
            });
        });
    }

    // --- CADASTRO ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('regUser').value;
            const pass = document.getElementById('regPass').value;
            const btnSubmit = registerForm.querySelector('button');

            if (!/^[a-zA-Z0-9._]+$/.test(user)) return showToast("Nome inválido. Use apenas letras e números sem espaços.", 'error');
            if (pass.length < 6) return showToast("A senha deve ter no mínimo 6 caracteres.", 'error');

            btnSubmit.innerText = "Criando...";
            btnSubmit.disabled = true;

            postData({ action: 'register', user: user, pass: pass })
            .then(data => {
                if (data.status === 'success') {
                    showToast('Conta criada! Redirecionando...', 'success');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else { 
                    showToast(data.message, 'error'); 
                    btnSubmit.innerText = "Registrar"; btnSubmit.disabled = false;
                }
            })
            .catch(() => {
                showToast('Erro de conexão.', 'error');
                btnSubmit.innerText = "Registrar"; btnSubmit.disabled = false;
            });
        });
    }

    // --- DASHBOARD ---
    const subjectsGrid = document.getElementById('subjectsGrid');
    const btnBuyBundle = document.getElementById('btnBuyBundle');

    if (subjectsGrid) {
        window.refreshGrid = function() {
            const savedPermissions = localStorage.getItem('userPermissions');
            const allowedSubjects = savedPermissions ? JSON.parse(savedPermissions) : [];
            const activeBtn = document.querySelector('.period-btn.active');
            const currentPeriod = activeBtn ? activeBtn.innerText.charAt(0) : '1';
            loadPeriod(currentPeriod, allowedSubjects);
        }

        fetch('subjects.json').then(res => res.json()).then(data => {
            window.allSubjectsData = data;
            refreshGrid();
        });

        window.loadPeriod = function(period, permissionsOverride = null) {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
            const buttons = document.querySelectorAll('.period-btn');
            if(buttons[period-1]) buttons[period-1].classList.add('active');

            if(btnBuyBundle) {
                btnBuyBundle.dataset.period = period;
            }

            let allowedSubjects = permissionsOverride;
            if(!allowedSubjects) {
                const saved = localStorage.getItem('userPermissions');
                allowedSubjects = saved ? JSON.parse(saved) : [];
            }

            subjectsGrid.innerHTML = '';
            const materias = window.allSubjectsData ? window.allSubjectsData[period] : [];

            if (materias) {
                materias.forEach((materia, index) => {
                    const isUnlocked = allowedSubjects.includes(materia);
                    const card = document.createElement('div');
                    
                    if (isUnlocked) {
                        card.className = 'subject-card fade-in';
                        card.innerHTML = `<h4>${materia}</h4>`;
                        card.onclick = () => openFilesModal(materia, period); 
                    } else {
                        card.className = 'subject-card locked fade-in';
                        card.innerHTML = `<div class="lock-icon"><i class="fas fa-lock"></i></div><h4>${materia}</h4>`;
                        card.onclick = () => openModal(materia); 
                    }
                    subjectsGrid.appendChild(card);
                });
            }
        };
    }

    // --- UPLOAD ADMIN ---
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length === 0) return showToast("Selecione pelo menos um arquivo.", 'error');

            document.getElementById('uploadLoading').style.display = 'block';
            document.querySelector('.modal-actions').style.display = 'none';

            try {
                const period = document.getElementById('uploadPeriod').value;
                const subject = document.getElementById('uploadSubject').value;
                const desc = document.getElementById('uploadDesc').value;
                const user = localStorage.getItem('username');
                const files = Array.from(fileInput.files);

                let finalBase64 = "", finalName = "", finalMime = "";

                if (files.length > 1 || (files.length === 1 && files[0].type.startsWith('image/'))) {
                    finalBase64 = await generatePdfFromImages(files);
                    finalName = desc.replace(/\s+/g, '_') + ".pdf";
                    finalMime = "application/pdf";
                } else {
                    finalBase64 = await toBase64(files[0]);
                    finalName = files[0].name;
                    finalMime = files[0].type;
                }

                const result = await postData({
                    action: 'upload_file', period, subject, description: desc, user,
                    fileData: finalBase64, fileName: finalName, mimeType: finalMime
                });

                if (result.status === 'success') {
                    showToast("Upload realizado com sucesso!", 'success');
                    closeAdminModal();
                    uploadForm.reset();
                } else { showToast("Erro: " + result.message, 'error'); }
            } catch (err) { showToast("Erro: " + err.message, 'error'); }
            finally {
                document.getElementById('uploadLoading').style.display = 'none';
                document.querySelector('.modal-actions').style.display = 'flex';
            }
        });
    }
});

// --- FUNÇÕES GLOBAIS ---

function openFilesModal(subject, period) {
    const modal = document.getElementById('filesModal');
    const container = document.getElementById('filesListContainer');
    document.getElementById('filesModalTitle').innerText = subject;
    modal.classList.add('active');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';

    fetch(API_URL, {
        method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'get_files', period: period, subject: subject })
    })
    .then(res => res.json())
    .then(data => {
        container.innerHTML = ''; 
        if (data.status === 'success' && data.files.length > 0) {
            data.files.forEach(file => {
                const item = document.createElement('div');
                item.style.cssText = "padding: 12px; border-bottom: 1px solid var(--border-color); display:flex; flex-direction:column; margin-bottom: 5px;";
                item.innerHTML = `
                    <a href="${file.url}" target="_blank" style="color: var(--text-main); text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-pdf" style="color: var(--danger);"></i> ${file.name}
                    </a>
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 24px;">${file.description}</span>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Pasta vazia.</p>';
        }
    })
    .catch(() => showToast("Erro ao carregar arquivos.", 'error'));
}
function closeFilesModal() { document.getElementById('filesModal').classList.remove('active'); }

// --- MODAL PAGAMENTO ---
const modalBuy = document.getElementById('buyModal');

function openModal(materia) {
    setupBuyModal(`🔓 Desbloquear Matéria`, "", () => initiatePayment(materia, false));
    const desc = document.querySelector('#step-confirm p');
    if(desc) {
        desc.innerHTML = `
            <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin:15px 0; border: 1px solid var(--border-color);">
                <p style="margin-bottom:8px; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-book" style="color:var(--primary)"></i> Matéria:<strong>${materia}</strong></p>
                <p style="margin-bottom:8px; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-bolt" style="color:#fbbf24"></i> Liberação<strong>IMEDIATA</strong></p>
                <p style="margin-bottom:0; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-file-pdf" style="color:#60a5fa"></i><strong>Acesso as PROVAS da matéria</strong></p>
            </div>
            <div style="font-size: 1.1rem; color: #fff;">
                <strong style="font-size: 1.4rem; color: #32A041;">R$ 11,90</strong>
            </div>
        `;
    }
}

function startBundlePurchase() {
    const btn = document.getElementById('btnBuyBundle');
    const period = btn.dataset.period || '1';
    
    setupBuyModal(`👑 Acesso TOTAL ao ${period}º Ano`, "", () => initiatePayment("BUNDLE", true, period));

    const desc = document.querySelector('#step-confirm p');
    if(desc) {
        desc.innerHTML = `
            <div style="text-align:left; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin:15px 0; border: 1px solid var(--border-color);">
                <p style="margin-bottom:8px; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-check-circle" style="color:var(--primary)"></i><strong>Acesso a TODAS as provas do ${period}º ano</strong></p>
                <p style="margin-bottom:8px; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-bolt" style="color:#fbbf24"></i> Liberação<strong>IMEDIATA</strong></p>
                <p style="margin-bottom:0; color:#e4e4e7; display:flex; align-items:center; gap:8px;"><i class="fas fa-file-download" style="color:#60a5fa"></i> Downloads<strong>ILIMITADOS</strong></p>
            </div>
            <div style="font-size: 1.1rem; color: #fff;">
                De <span style="text-decoration: line-through; color: #71717a; margin-right: 5px;">R$ 119,00</span>
                por <strong style="font-size: 1.4rem; color: #fbbf24;">R$ 49,90</strong>
                <br><small style="color:#32A041; font-weight:bold; letter-spacing:1px; font-size:0.75rem;">(60% OFF - OFERTA LIMITADA)</small>
            </div>
        `;
    }
}

function setupBuyModal(title, price, onConfirm) {
    document.getElementById('step-confirm').style.display = 'block';
    document.getElementById('step-pix').style.display = 'none';
    document.getElementById('step-loading').style.display = 'none';
    
    document.querySelector('#step-confirm h3').innerText = title;
    
    if (!title.includes("Premium") && !title.includes("Matéria") && price !== "") {
        document.querySelector('#step-confirm p').innerHTML = `Esta disciplina requer desbloqueio.<br>Valor: <strong>${price}</strong>`;
    }
    
    const oldBtn = document.querySelector('#step-confirm .btn-primary');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.onclick = onConfirm;
    modalBuy.classList.add('active');
}

function initiatePayment(materia, isBundle, period = null) {
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-loading').style.display = 'block';
    const u = localStorage.getItem('username');

    fetch(API_URL, {
        method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'create_pix', materia: materia, user: u, isBundle: isBundle, period: period })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('pix-image').src = `data:image/png;base64,${data.qr_base64}`;
            document.getElementById('pix-copypaste').value = data.qr_code;
            document.getElementById('step-loading').style.display = 'none';
            document.getElementById('step-pix').style.display = 'block';
            startPolling(data.payment_id, u, materia, isBundle, period);
        } else { showToast("Erro ao gerar PIX: " + data.message, 'error'); closeModal(); }
    })
    .catch(() => { showToast("Erro de conexão.", 'error'); closeModal(); });
}

let checkInterval;
function startPolling(pid, u, m, isBundle, period) {
    if(checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
        fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'check_payment', payment_id: pid, user: u, materia: m, isBundle: isBundle, period: period })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'approved') {
                clearInterval(checkInterval);
                localStorage.setItem('userPermissions', JSON.stringify(data.permissions));
                showToast("Pagamento Aprovado! Acesso Liberado.", 'success');
                closeModal();
                if(window.refreshGrid) window.refreshGrid();
            }
        });
    }, 4000);
}

function closeModal() { modalBuy.classList.remove('active'); if(checkInterval) clearInterval(checkInterval); }
function copyPix() { 
    const c = document.getElementById("pix-copypaste"); 
    c.select(); navigator.clipboard.writeText(c.value); 
    showToast("Código PIX copiado!", 'success');
}

// 3. ADMIN & UTILS
function openAdminModal() { document.getElementById('adminModal').classList.add('active'); }
function closeAdminModal() { document.getElementById('adminModal').classList.remove('active'); }
function updateUploadSubjects() {
    if (!window.allSubjectsData) return;
    const period = document.getElementById('uploadPeriod').value;
    const subjects = window.allSubjectsData[period];
    const select = document.getElementById('uploadSubject');
    select.innerHTML = "";
    if(subjects) subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub; select.appendChild(opt);
    });
}
function toBase64(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result.split(',')[1]); reader.onerror = j; }); }
function readFileAsDataURL(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.onload = (e) => r(e.target.result); reader.readAsDataURL(file); }); }
async function generatePdfFromImages(files) {
    if (!window.jspdf) throw new Error("Lib jsPDF faltando");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    for (let i = 0; i < files.length; i++) {
        const d = await readFileAsDataURL(files[i]);
        const p = doc.getImageProperties(d);
        const w = doc.internal.pageSize.getWidth();
        const h = (p.height * w) / p.width;
        if (i > 0) doc.addPage();
        doc.addImage(d, 'JPEG', 0, 0, w, h);
    }
    return doc.output('datauristring').split(',')[1];
}