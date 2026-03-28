const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registrar novo usuário
exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha, cpf } = req.body;
        
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).json({ msg: 'Usuário já existe' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senha, salt);
        
        user = await User.create({
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
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ msg: 'Credenciais inválidas' });
        }
        
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(400).json({ msg: 'Credenciais inválidas' });
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
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};