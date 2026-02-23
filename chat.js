// Configuração do Supabase
const SUPABASE_URL = 'https://oknysnqbidhcdqinehwk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UrxALLkgzzTBDNpQxSypBQ_7dJMQpsj';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar se está logado
const userData = sessionStorage.getItem('templario_user');
if (!userData) {
    window.location.href = 'login.html';
}

const usuarioAtual = JSON.parse(userData);

// Elementos DOM
const profileName = document.getElementById('profileName');
const profileAvatar = document.getElementById('profileAvatar');
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');
const membersList = document.getElementById('membersList');
const onlineCount = document.getElementById('onlineCount');
const emojiToggle = document.getElementById('emojiToggle');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
const emojiCats = document.querySelectorAll('.emoji-cat');

// Emojis
const emojiCategories = {
    smileys: ['😊', '😂', '🥰', '😎', '🤔', '😴', '🥳', '😱', '🤗', '😡', '😭', '🤯', '🥺', '😈', '👻', '💀'],
    gestures: ['👋', '✌️', '🤞', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '💪'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗']
};

// Inicializar
function init() {
    // Mostrar perfil
    profileName.textContent = usuarioAtual.nome;
    profileAvatar.src = usuarioAtual.avatar;
    
    if (usuarioAtual.is_admin) {
        profileName.innerHTML += ' <span class="admin-badge">ADMIN</span>';
    }

    // Carregar dados
    carregarMensagens();
    carregarMembros();
    
    // Configurar tempo real
    setupRealtime();
    
    // Event listeners
    setupEvents();
    
    // Carregar emojis
    carregarEmojis('smileys');
    
    // Atualizar status online
    atualizarStatusOnline(true);
    
    // Atualizar membros a cada 10 segundos
    setInterval(carregarMembros, 10000);
}

// Event listeners
function setupEvents() {
    sendBtn.addEventListener('click', enviarMensagem);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensagem();
    });

    logoutBtn.addEventListener('click', () => {
        atualizarStatusOnline(false);
        sessionStorage.removeItem('templario_user');
        window.location.href = 'login.html';
    });

    // Emojis
    emojiToggle.addEventListener('click', () => {
        emojiPicker.classList.toggle('show');
    });

    emojiBtn.addEventListener('click', () => {
        emojiPicker.classList.toggle('show');
    });

    // Fechar emoji picker ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-btn') && 
            !e.target.closest('.emoji-toggle') && 
            !e.target.closest('.emoji-picker')) {
            emojiPicker.classList.remove('show');
        }
    });

    // Categorias de emoji
    emojiCats.forEach(cat => {
        cat.addEventListener('click', () => {
            emojiCats.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            carregarEmojis(cat.dataset.cat);
        });
    });
}

// Tempo real
function setupRealtime() {
    supabase
        .channel('mensagens')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'mensagens' },
            (payload) => {
                adicionarMensagem(payload.new);
                scrollToBottom();
            }
        )
        .subscribe();
}

// Carregar mensagens
async function carregarMensagens() {
    try {
        const { data: mensagens } = await supabase
            .from('mensagens')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);
        
        const welcomeMsg = messagesArea.querySelector('.welcome-message');
        messagesArea.innerHTML = '';
        if (welcomeMsg) messagesArea.appendChild(welcomeMsg);
        
        if (mensagens) {
            mensagens.forEach(msg => adicionarMensagem(msg));
        }
        scrollToBottom();
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

// Adicionar mensagem
function adicionarMensagem(msg) {
    const isSentByMe = msg.usuario_id === usuarioAtual.id;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSentByMe ? 'sent' : 'received'}`;
    
    const isAdmin = msg.usuario_nome === 'Pedrinho Gameplays';
    
    const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-header">
                <img src="${msg.usuario_avatar}" class="message-avatar">
                <span class="message-author ${isAdmin ? 'admin' : ''}">
                    ${msg.usuario_nome}
                    ${isAdmin ? '<span class="admin-message-badge">👑</span>' : ''}
                </span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">
                ${escapeHtml(msg.mensagem)}
            </div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll para baixo
function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Enviar mensagem
async function enviarMensagem() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    try {
        const { error } = await supabase
            .from('mensagens')
            .insert([{
                usuario_id: usuarioAtual.id,
                usuario_nome: usuarioAtual.nome,
                usuario_avatar: usuarioAtual.avatar,
                mensagem: text
            }]);
        
        if (error) throw error;
        
        messageInput.value = '';
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    }
}

// Carregar membros
async function carregarMembros() {
    try {
        const { data: usuarios } = await supabase
            .from('usuarios')
            .select('*')
            .order('last_seen', { ascending: false });
        
        if (!usuarios) return;
        
        membersList.innerHTML = '';
        
        const now = new Date();
        let online = 0;
        
        usuarios.sort((a, b) => {
            if (a.is_admin) return -1;
            if (b.is_admin) return 1;
            return 0;
        });
        
        usuarios.forEach(user => {
            const lastSeen = new Date(user.last_seen);
            const diffMinutes = (now - lastSeen) / (1000 * 60);
            const isOnline = user.id === usuarioAtual.id || diffMinutes < 5;
            
            if (isOnline) online++;
            
            const memberDiv = document.createElement('div');
            memberDiv.className = `member-item ${user.is_admin ? 'admin' : ''}`;
            
            memberDiv.innerHTML = `
                <img src="${user.avatar_url}" class="member-avatar">
                <div class="member-info">
                    <div class="member-name">
                        ${user.nome}
                        ${user.is_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                    </div>
                    <div class="member-status">
                        <i class="fas fa-circle" style="color: ${isOnline ? '#10b981' : '#6b7280'}; font-size: 8px;"></i>
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
            `;
            
            membersList.appendChild(memberDiv);
        });
        
        onlineCount.textContent = online;
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
    }
}

// Carregar emojis
function carregarEmojis(categoria) {
    emojiGrid.innerHTML = '';
    
    emojiCategories[categoria].forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.onclick = () => {
            messageInput.value += emoji;
            emojiPicker.classList.remove('show');
            messageInput.focus();
        };
        emojiGrid.appendChild(span);
    });
}

// Atualizar status online
async function atualizarStatusOnline(isOnline) {
    if (isOnline) {
        await supabase
            .from('usuarios')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', usuarioAtual.id);
    }
}

// Iniciar
init();