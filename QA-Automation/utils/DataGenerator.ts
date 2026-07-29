import { faker } from '@faker-js/faker';

export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  college: string;
  branch: string;
  degree: string;
  experienceYears: number;
  skills: string[];
  bio: string;
  linkedIn: string;
  github: string;
  portfolio: string;
}

export class DataGenerator {
  static generateStudentProfile(): UserProfile {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName, provider: 'testqa.com' }).toLowerCase(),
      phone: faker.phone.number({ style: 'national' }),
      password: 'TestPass@123',
      address: faker.location.streetAddress({ useFullAddress: true }),
      college: faker.company.name() + ' Institute of Technology',
      branch: faker.helpers.arrayElement(['Computer Science', 'Information Technology', 'AI & Data Science', 'Electronics']),
      degree: 'B.Tech / B.E.',
      experienceYears: faker.number.int({ min: 0, max: 2 }),
      skills: faker.helpers.arrayElements(['TypeScript', 'React', 'Python', 'Node.js', 'SQL', 'Docker', 'Machine Learning'], 4),
      bio: faker.lorem.paragraph(2),
      linkedIn: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      github: `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      portfolio: `https://${firstName.toLowerCase()}${lastName.toLowerCase()}.dev`
    };
  }

  static generateMentorProfile(): UserProfile {
    const profile = this.generateStudentProfile();
    profile.experienceYears = faker.number.int({ min: 5, max: 15 });
    profile.degree = 'M.Tech / Ph.D.';
    return profile;
  }

  static generateAlumniProfile(): UserProfile {
    const profile = this.generateStudentProfile();
    profile.experienceYears = faker.number.int({ min: 2, max: 10 });
    return profile;
  }

  static generateCollegeProfile() {
    const collegeName = faker.company.name() + ' University';
    return {
      institutionName: collegeName,
      code: faker.string.alphanumeric({ length: 6, casing: 'upper' }),
      email: faker.internet.email({ firstName: 'admin', provider: collegeName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.edu.in' }),
      phone: faker.phone.number({ style: 'national' }),
      address: faker.location.streetAddress(),
      website: `https://www.${collegeName.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`,
      establishedYear: 1995,
      accreditation: 'NAAC A++'
    };
  }
}
