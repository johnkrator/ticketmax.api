import { Entity } from '../interfaces/agent.interface';

interface CodeSample {
  language: string;
  description: string;
  code: string;
  explanation: string;
}

export class CodingAssistant {
  private codeSamples: Map<string, CodeSample[]> = new Map();

  constructor() {
    this.initializeCodeSamples();
  }

  private initializeCodeSamples(): void {
    // JavaScript/TypeScript samples
    this.codeSamples.set('javascript', [
      {
        language: 'javascript',
        description: 'async function with error handling',
        code: `async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}`,
        explanation: 'This async function fetches user data with proper error handling and HTTP status checking.'
      },
      {
        language: 'javascript',
        description: 'array manipulation methods',
        code: `const users = [
  { id: 1, name: 'John', active: true },
  { id: 2, name: 'Jane', active: false },
  { id: 3, name: 'Bob', active: true }
];

// Filter active users
const activeUsers = users.filter(user => user.active);

// Get user names
const userNames = users.map(user => user.name);

// Find user by id
const user = users.find(user => user.id === 2);

// Check if any user is active
const hasActiveUsers = users.some(user => user.active);`,
        explanation: 'Common array methods for filtering, mapping, finding, and checking conditions.'
      }
    ]);

    // React samples
    this.codeSamples.set('react', [
      {
        language: 'typescript',
        description: 'React functional component with hooks',
        code: `import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(\`/api/users/\${userId}\`);
        if (!response.ok) throw new Error('User not found');
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

export default UserProfile;`,
        explanation: 'React functional component with TypeScript, using useState and useEffect hooks for data fetching.'
      }
    ]);

    // NestJS samples
    this.codeSamples.set('nestjs', [
      {
        language: 'typescript',
        description: 'NestJS service with dependency injection',
        code: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(\`User with ID \${id} not found\`);
    }
    return user;
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}`,
        explanation: 'NestJS service with TypeORM repository pattern, including CRUD operations and error handling.'
      }
    ]);

    // Database queries
    this.codeSamples.set('database', [
      {
        language: 'javascript',
        description: 'MongoDB queries with Mongoose',
        code: `// Find documents with conditions
const users = await User.find({ 
  active: true, 
  age: { $gte: 18, $lte: 65 } 
});

// Find with population
const userWithPosts = await User.findById(userId)
  .populate('posts')
  .populate('profile');

// Aggregation pipeline
const userStats = await User.aggregate([
  { $match: { active: true } },
  { $group: { 
    _id: '$department', 
    count: { $sum: 1 },
    avgAge: { $avg: '$age' }
  }},
  { $sort: { count: -1 } }
]);

// Update operations
await User.findByIdAndUpdate(
  userId, 
  { $set: { lastActive: new Date() } },
  { new: true }
);`,
        explanation: 'Common MongoDB operations using Mongoose including find, populate, aggregation, and updates.'
      }
    ]);

    // Algorithm samples
    this.codeSamples.set('algorithm', [
      {
        language: 'javascript',
        description: 'common algorithms and data structures',
        code: `// Binary search
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}

// Debounce function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Deep clone object
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}`,
        explanation: 'Useful algorithms including binary search, debounce function, and deep clone implementation.'
      }
    ]);
  }

  public getCodingHelp(query: string, entities: Entity[]): string {
    const queryLower = query.toLowerCase();
    
    // Detect programming languages mentioned
    const programmingLanguages = entities
      .filter(entity => entity.type === 'programming_language')
      .map(entity => entity.value.toLowerCase());

    // If specific language mentioned, prioritize samples from that language
    let relevantSamples: CodeSample[] = [];
    
    if (programmingLanguages.length > 0) {
      for (const lang of programmingLanguages) {
        const samples = this.codeSamples.get(lang) || [];
        relevantSamples.push(...samples);
      }
    }

    // If no specific language, search all samples
    if (relevantSamples.length === 0) {
      for (const samples of this.codeSamples.values()) {
        relevantSamples.push(...samples);
      }
    }

    // Find the most relevant sample
    const bestMatch = this.findBestCodeMatch(queryLower, relevantSamples);
    
    if (bestMatch) {
      return this.formatCodeResponse(bestMatch, query);
    }

    // Return general programming help
    return this.getGeneralProgrammingHelp(query);
  }

  private findBestCodeMatch(query: string, samples: CodeSample[]): CodeSample | null {
    let bestScore = 0;
    let bestSample: CodeSample | null = null;

    for (const sample of samples) {
      let score = 0;

      // Check description match
      const descWords = sample.description.toLowerCase().split(' ');
      for (const word of descWords) {
        if (query.includes(word)) {
          score += 0.3;
        }
      }

      // Check code content match (basic keyword matching)
      const codeWords: string[] = sample.code.toLowerCase().match(/\b\w+\b/g) || [];
      const queryWords: string[] = query.match(/\b\w+\b/g) || [];
      
      queryWords.forEach((queryWord: string) => {
        if (codeWords.includes(queryWord)) {
          score += 0.1;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestSample = sample;
      }
    }

    return bestScore > 0.5 ? bestSample : null;
  }

  private formatCodeResponse(sample: CodeSample, originalQuery: string): string {
    return `Here's a ${sample.language} example for ${sample.description}:

\`\`\`${sample.language}
${sample.code}
\`\`\`

**Explanation:** ${sample.explanation}

Is this what you were looking for, or would you like me to help with a specific part of your code?`;
  }

  private getGeneralProgrammingHelp(query: string): string {
    const helpTopics = [
      'I can help you with various programming topics including:',
      '• JavaScript/TypeScript functions, classes, and async programming',
      '• React components, hooks, and state management',
      '• NestJS services, controllers, and dependency injection',
      '• Database queries and MongoDB operations',
      '• Common algorithms and data structures',
      '• Code debugging and optimization',
      '',
      'Please provide more specific details about what you\'re trying to implement, and I\'ll give you a tailored code example.'
    ];

    return helpTopics.join('\n');
  }

  public explainCode(code: string): string {
    // Basic code analysis and explanation
    const explanations: string[] = [];
    
    if (code.includes('async') && code.includes('await')) {
      explanations.push('• This code uses async/await for handling asynchronous operations');
    }
    
    if (code.includes('try') && code.includes('catch')) {
      explanations.push('• Error handling is implemented with try-catch blocks');
    }
    
    if (code.includes('.map(') || code.includes('.filter(') || code.includes('.reduce(')) {
      explanations.push('• Array methods are used for data transformation');
    }
    
    if (code.includes('useState') || code.includes('useEffect')) {
      explanations.push('• React hooks are used for state management and side effects');
    }
    
    if (code.includes('@Injectable') || code.includes('@Controller')) {
      explanations.push('• NestJS decorators are used for dependency injection');
    }

    if (explanations.length === 0) {
      return 'I can see your code, but I\'d need more context to provide a detailed explanation. Could you tell me what specific part you\'d like me to explain?';
    }

    return 'Code Analysis:\n' + explanations.join('\n') + 
           '\n\nWould you like me to explain any specific part in more detail?';
  }

  public debugCode(code: string, error?: string): string {
    const suggestions: string[] = [];

    if (error) {
      suggestions.push(`**Error Analysis:** ${error}`);
      suggestions.push('');
    }

    // Common debugging suggestions
    if (code.includes('await') && !code.includes('async')) {
      suggestions.push('• Make sure the function containing `await` is marked as `async`');
    }

    if (code.includes('map') && code.includes('return') && !code.includes('(')) {
      suggestions.push('• Check that your arrow functions have proper syntax');
    }

    if (code.includes('useState') && !code.includes('import')) {
      suggestions.push('• Make sure you\'ve imported useState from React');
    }

    if (suggestions.length === 0) {
      suggestions.push('Common debugging steps:');
      suggestions.push('• Check console for error messages');
      suggestions.push('• Verify all imports are correct');
      suggestions.push('• Ensure proper variable declarations');
      suggestions.push('• Check for typos in function/variable names');
    }

    return suggestions.join('\n');
  }
}