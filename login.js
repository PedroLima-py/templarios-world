// SUA CONFIGURAÇÃO - JÁ COLEI SUAS CHAVES
const supabaseUrl = 'https://oknysnqbidhcdqinehwk.supabase.co';
const supabaseKey = 'sb_publishable_UrxALLkgzzTBDNpQxSypBQ_7dJMQpsj';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos DOM
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const avatarOptions = document.querySelectorAll('.avatar-option');
const selectedAvatar = document.getElementById('selectedAvatar');

// Alternar entre tabs
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
});

// Selecionar avatar
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar.value = option.dataset.seed;
    });
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('loginNome').value;
    const senha = document.getElementById('loginSenha').value;
    
    try {
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('nome', nome)
            .eq('senha', senha);
        
        if (error) throw error;
        
        if (usuarios && usuarios.length > 0) {
            const usuario = usuarios[0];
            
            sessionStorage.setItem('templario_user', JSON.stringify({
                id: usuario.id,
                nome: usuario.nome,
                avatar: usuario.avatar_url,
                is_admin: usuario.is_admin
            }));
            
            await supabase
                .from('usuarios')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', usuario.id);
            
            window.location.href = 'index.html';
        } else {
            alert('Nome ou senha incorretos!');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
});

// Registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('registerNome').value;
    const senha = document.getElementById('registerSenha').value;
    const confirmar = document.getElementById('registerConfirmarSenha').value;
    const avatar = selectedAvatar.value;
    
    if (senha !== confirmar) {
        alert('As senhas não coincidem!');
        return;
    }
    
    if (senha.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres!');
        return;
    }
    
    try {
        const { data: existentes } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('nome', nome);
        
        if (existentes && existentes.length > 0) {
            alert('Nome de usuário já existe! Escolha outro.');
            return;
        }
        
        const avatarUrl = `https://api.dicebear.com/7.x/avataaas/svg?seed=${avatar}`;
        
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nome: nome,
                senha: senha,
                avatar_url: avatarUrl,
                is_admin: false
            }])
            .select();
        
        if (error) throw error;
        
        if (data && data[0]) {
            alert('Conta criada com sucesso! Faça login para continuar.');
            loginTab.click();
            document.getElementById('loginNome').value = nome;
            document.getElementById('loginSenha').value = '';
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        alert('Erro ao criar conta. Tente novamente.');
    }
});

// Verificar se já está logado
const userSession = sessionStorage.getItem('templario_user');
if (userSession && window.location.pathname.includes('login.html')) {
    window.location.href = 'index.html';
}