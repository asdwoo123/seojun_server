module.exports = (sequelize, DataTypes) => (
    sequelize.define('project', {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(100),
            allowNull: true
        }}, {
        timestamp: true
    })
);

