const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Импорт модели пользователя

const Student = sequelize.define('Student', {
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    class_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true,
});

module.exports = Student;
