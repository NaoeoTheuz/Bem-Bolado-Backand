const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Denuncia = sequelize.define('Denuncia', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    denunciante_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Quem denunciou'
    },
    denunciado_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Quem foi denunciado'
    },
    motivo: {
        type: DataTypes.ENUM(
            'spam',
            'ofensivo',
            'discurso_odio',
            'conteudo_inapropriado',
            'assédio',
            'falso_perfil',
            'outro'
        ),
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imagem: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Imagem anexada à denúncia (Base64)'
    },
    status: {
        type: DataTypes.ENUM('pendente', 'analisada', 'arquivada'),
        defaultValue: 'pendente'
    },
    acao_admin: {
        type: DataTypes.ENUM('nenhuma', 'suspenso', 'banido', 'observacao', 'arquivada'),
        defaultValue: 'nenhuma'
    },
    observacao_admin: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    data_acao: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // =============================================
    // NOVOS CAMPOS PARA FORNECIMENTO DE DADOS
    // =============================================
    dados_fornecidos: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica se os dados do denunciado já foram fornecidos ao denunciante'
    },
    data_fornecimento: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data em que os dados foram fornecidos ao denunciante'
    }
}, {
    tableName: 'denuncias',
    timestamps: true,
    underscored: true
});

module.exports = Denuncia;
