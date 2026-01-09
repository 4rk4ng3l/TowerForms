export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

export class UserEntity implements User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly role: string,
    public readonly createdAt: Date,
  ) {}

  static create(
    id: string,
    email: string,
    name: string,
    role: string,
  ): UserEntity {
    return new UserEntity(id, email, name, role, new Date());
  }

  static fromJson(json: any): UserEntity {
    return new UserEntity(
      json.id,
      json.email,
      json.name || (json.firstName && json.lastName ? `${json.firstName} ${json.lastName}` : json.email),
      json.role,
      json.createdAt ? new Date(json.createdAt) : new Date(),
    );
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
