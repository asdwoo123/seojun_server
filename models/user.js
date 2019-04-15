module.exports = (sequelize, DataTypes) => (
    sequelize.define('user', {
        username: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        locale: {
            type: DataTypes.STRING(20),
            allowNull: false
        }
    }, {
        timestamps: true
    })
);
