// import {UserEntity} from '@core/entities/User';
// import {IUserRepository} from '@core/repositories/IUserRepository';

// export class GetCurrentUserUseCase {
//   constructor(private userRepository: IUserRepository) {}

//   async execute(): Promise<UserEntity | null> {
//     try {
//       // Get current user from local database
//       const user = await this.userRepository.getCurrentUser();
//       return user;
//     } catch (error: any) {
//       console.error('Error getting current user:', error);
//       return null;
//     }
//   }
// }
