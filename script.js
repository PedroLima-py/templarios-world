// SUA CONFIGURAÇÃO - JÁ COLEI SUAS CHAVES
const supabaseUrl = 'https://oknysnqbidhcdqinehwk.supabase.co';
const supabaseKey = 'sb_publishable_UrxALLkgzzTBDNpQxSypBQ_7dJMQpsj';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class TemplariosWorld {
    constructor() {
        this.user = null;
        this.onlineUsers = new Map();
        this.emojiCategories = {
            smileys: ['😊', '😂', '🥰', '😎', '🤔', '😴', '🥳', '😱', '🤗', '😡', '😭', '🤯', '🥺', '😈', '👻', '💀', '👽', '🤖', '🎃', '😺'],
            gestures: ['👋', '✌️', '🤞', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🖕', '✍️', '👌', '🤌'],
            hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
        };
        
        this.init();
    }
    
    async init() {
        const userData = sessionStorage.getItem('templario_user');
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }
        
        this.user = JSON.parse(userData);
        
        this.loadUserProfile();
        this.loadOnlineMembers();
        this.loadMessages();
        this.setupEvents();
        this.setupRealtime();
        this.updateOnlineStatus(true);
        this.setupEmojis();
    }
    
    loadUserProfile() {
        document.getElementById('profileName').textContent = this.user.nome;
        document.getElementById('profileAvatar').src = this.user.avatar;
        
        if (this.user.is_admin) {
            document.getElementById('profileName').style.color = '#fbbf24';
            document.getElementById('profileName').innerHTML += ' <span class="admin-badge">ADMIN</span>';
        }
    }
    
    async loadOnlineMembers() {
        try {
            const { data: usuarios } = await supabase
                .from('usuarios')
                .select('*')
                .order('last_seen', { ascending: false });
            
            if (usuarios) {
                this.updateMembersList(usuarios);
            }
        } catch (error) {
            console.error('Erro ao carregar membros:', error);
        }
    }
    
    updateMembersList(usuarios) {
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = '';
        
        const now = new Date();
        let onlineCount = 0;
        
        const sorted = usuarios.sort((a, b) => {
            if (a.is_admin) return -1;
            if (b.is_admin) return 1;
            return 0;
        });
        
        sorted.forEach(usuario => {
            const lastSeen = new Date(usuario.last_seen);
            const diffMinutes = (now - lastSeen) / (1000 * 60);
            const isOnline = usuario.id === this.user.id || diffMinutes < 5;
            
            if (isOnline) onlineCount++;
            
            const memberItem = document.createElement('div');
            memberItem.className = `member-item ${usuario.is_admin ? 'admin' : ''}`;
            memberItem.id = `member-${usuario.id}`;
            
            memberItem.innerHTML = `
                <img src="${usuario.avatar_url}" alt="${usuario.nome}" class="member-avatar">
                <div class="member-info">
                    <div class="member-name">
                        ${usuario.nome}
                        ${usuario.is_admin ? '<span class="admin-badge">ADMIN</span>' : ''}
                    </div>
                    <div class="member-status">
                        <i class="fas fa-circle" style="color: ${isOnline ? '#10b981' : '#6b7280'}; font-size: 8px;"></i>
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
            `;
            
            membersList.appendChild(memberItem);
        });
        
        document.getElementById('onlineCount').textContent = onlineCount;
    }
    
    async loadMessages() {
        try {
            const { data: mensagens } = await supabase
                .from('mensagens')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(100);
            
            const messagesArea = document.getElementById('messagesArea');
            const welcomeMsg = messagesArea.querySelector('.welcome-message');
            messagesArea.innerHTML = '';
            if (welcomeMsg) messagesArea.appendChild(welcomeMsg);
            
            if (mensagens) {
                mensagens.forEach(msg => this.addMessageToChat(msg));
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    }
    
    setupEvents() {
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        document.getElementById('emojiToggle').addEventListener('click', () => {
            document.getElementById('emojiPicker').classList.toggle('show');
        });
        
        document.getElementById('emojiBtn').addEventListener('click', () => {
            document.getElementById('emojiPicker').classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            const picker = document.getElementById('emojiPicker');
            if (!e.target.closest('.emoji-btn') && 
                !e.target.closest('.emoji-toggle') && 
                !e.target.closest('.emoji-picker')) {
                picker.classList.remove('show');
            }
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.updateOnlineStatus(false);
            sessionStorage.removeItem('templario_user');
            window.location.href = 'login.html';
        });
        
        window.addEventListener('beforeunload', () => {
            this.updateOnlineStatus(false);
        });
    }
    
    setupEmojis() {
        const categories = document.querySelectorAll('.emoji-cat');
        
        this.loadEmojiCategory('smileys');
        
        categories.forEach(cat => {
            cat.addEventListener('click', () => {
                categories.forEach(c => c.classList.remove('active'));
                cat.classList.add('active');
                this.loadEmojiCategory(cat.dataset.cat);
            });
        });
    }
    
    loadEmojiCategory(category) {
        const emojiGrid = document.getElementById('emojiGrid');
        emojiGrid.innerHTML = '';
        
        this.emojiCategories[category].forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.addEventListener('click', () => {
                document.getElementById('messageInput').value += emoji;
                document.getElementById('emojiPicker').classList.remove('show');
                document.getElementById('messageInput').focus();
            });
            emojiGrid.appendChild(span);
        });
    }
    
    setupRealtime() {
        supabase
            .channel('mensagens')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'mensagens' },
                (payload) => {
                    this.addMessageToChat(payload.new);
                    this.scrollToBottom();
                }
            )
            .subscribe();
        
        setInterval(() => this.loadOnlineMembers(), 10000);
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        try {
            const { error } = await supabase
                .from('mensagens')
                .insert([{
                    usuario_id: this.user.id,
                    usuario_nome: this.user.nome,
                    usuario_avatar: this.user.avatar,
                    mensagem: text
                }]);
            
            if (error) throw error;
            
            input.value = '';
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem. Tente novamente.');
        }
    }
    
    addMessageToChat(msg) {
        const messagesArea = document.getElementById('messagesArea');
        const isSentByMe = msg.usuario_id === this.user.id;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSentByMe ? 'sent' : 'received'}`;
        
        const isAdmin = msg.usuario_nome === 'Pedrinho Gameplays';
        
        const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <img src="${msg.usuario_avatar}" alt="${msg.usuario_nome}" class="message-avatar">
                    <span class="message-author ${isAdmin ? 'admin' : ''}">
                        ${msg.usuario_nome}
                        ${isAdmin ? '<span class="admin-message-badge">👑</span>' : ''}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">
                    ${this.escapeHtml(msg.mensagem)}
                </div>
            </div>
        `;
        
        messagesArea.appendChild(messageDiv);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        const messagesArea = document.getElementById('messagesArea');
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
    
    async updateOnlineStatus(isOnline) {
        if (isOnline) {
            await supabase
                .from('usuarios')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', this.user.id);
        }
    }
}

// Iniciar o chat
document.addEventListener('DOMContentLoaded', () => {
    new TemplariosWorld();
});