module.exports = (sequelize, DataTypes) => (
  sequelize.define("verify", {
    uuid: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    }
  })
);
