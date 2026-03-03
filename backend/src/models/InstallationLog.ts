import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  DataType,
  CreatedAt,
  UpdatedAt
} from "sequelize-typescript";

@Table({ tableName: "InstallationLogs" })
class InstallationLog extends Model<InstallationLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  ip: string;

  @Column
  frontend_url: string;

  @Column
  backend_url: string;

  @Column
  admin_url: string;

  @Column
  deploy_password: string;

  @Column
  master_password: string;

  @Column
  hostname: string;

  @Column
  os_info: string;

  @Column
  installer_version: string;

  @Column(DataType.JSON)
  raw_payload: object | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default InstallationLog;
