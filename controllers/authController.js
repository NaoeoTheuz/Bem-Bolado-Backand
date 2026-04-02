const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrar novo usuário
exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha, cpf } = req.body;
        
        // Verificar se email já existe
        let userEmail = await User.findOne({ where: { email } });
        if (userEmail) {
            return res.status(400).json({ msg: 'Este email já está cadastrado!' });
        }
        
        // Verificar se CPF já existe
        let userCpf = await User.findOne({ where: { cpf } });
        if (userCpf) {
            return res.status(400).json({ msg: 'Este CPF já está cadastrado!' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);
        
        const user = await User.create({
            nome,
            email,
            senha: senhaCriptografada,
            cpf
        });
        
        const token = jwt.sign(
            { usuarioId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            usuario: {
                id: user.id,
                nome: user.nome,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor. Tente novamente mais tarde.' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ msg: 'Email ou senha inválidos!' });
        }
        
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(400).json({ msg: 'Email ou senha inválidos!' });
        }
        
        const token = jwt.sign(
            { usuarioId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            usuario: {
                id: user.id,
                nome: user.nome,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor. Tente novamente mais tarde.' });
    }
};
