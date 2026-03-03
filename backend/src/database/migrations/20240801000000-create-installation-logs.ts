import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("InstallationLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ip: {
        type: DataTypes.STRING,
        allowNull: false
      },
      frontend_url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      backend_url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      admin_url: {
        type: DataTypes.STRING,
        allowNull: true
      },
      deploy_password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      master_password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      hostname: {
        type: DataTypes.STRING,
        allowNull: true
      },
      os_info: {
        type: DataTypes.STRING,
        allowNull: true
      },
      installer_version: {
        type: DataTypes.STRING,
        allowNull: true
      },
      raw_payload: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("InstallationLogs");
  }
};
