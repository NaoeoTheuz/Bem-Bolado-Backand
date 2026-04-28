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
    status: {
        type: DataTypes.ENUM('pendente', 'analisada', 'arquivada'),
        defaultValue: 'pendente'
    }
}, {
    tableName: 'denuncias',
    timestamps: true,
    underscored: true
});

module.exports = Denuncia;
