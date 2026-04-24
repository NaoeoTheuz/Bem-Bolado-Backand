const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Seguidor = sequelize.define('Seguidor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    seguidor_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    seguindo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'seguidores',
    timestamps: true,
    underscored: true
});

// Associações (adicione no server.js)
// Seguidor.belongsTo(User, { as: 'seguidor', foreignKey: 'seguidor_id' });
// Seguidor.belongsTo(User, { as: 'seguindo', foreignKey: 'seguindo_id' });

module.exports = Seguidor;
