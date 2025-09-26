# Design Document

## Overview

This design document outlines the refactoring of the user identification system in Jarvis Bot to create a centralized, consistent, and reliable user lookup mechanism. The refactor will eliminate duplicate code and provide a single source of truth for user identification across all commands.

## Architecture

### Current State
- Multiple commands have their own user lookup logic
- Inconsistent handling of whatsapp_id vs whatsapp_lid
- Duplicate database queries across different files
- Mixed error handling approaches

### Target State
- Single centralized user utility function
- Consistent OR-based lookup for both ID types
- Standardized error handling
- Reduced code duplication

## Components and Interfaces

### 1. User Utility Module (`/src/utils/userUtils.ts`)

#### Primary Function: `findUserById`
```typescript
export async function findUserById(userId: string): Promise<User | null>
```

**Purpose:** Centralized user lookup function that searches both whatsapp_id and whatsapp_lid columns.

**Parameters:**
- `userId: string` - The WhatsApp ID to search for

**Returns:**
- `User | null` - Complete user object if found, null if not found

**Implementation Details:**
- Uses Supabase OR clause: `whatsapp_id.eq.${userId},whatsapp_lid.eq.${userId}`
- Selects all user fields: id, name, role, xp, level, birthday, whatsapp_id, whatsapp_lid
- Handles database errors gracefully
- Includes debug logging for troubleshooting

#### Helper Function: `getUserRole`
```typescript
export async function getUserRole(userId: string): Promise<string | null>
```

**Purpose:** Quick role lookup for permission checking.

**Implementation:** Calls findUserById and extracts role field.

### 2. Refactored Commands

#### Command Handler (`/src/handlers/commandHandler.ts`)
- Replace getUserRole with userUtils.getUserRole
- Maintain existing permission checking logic
- Improve error messages for unauthorized access

#### Profile Command (`/src/commands/profile.ts`)
- Replace getUserProfile and getUserProfileByName with findUserById
- Simplify user data retrieval logic
- Maintain existing display formatting

#### PR Command (`/src/commands/pr.ts`)
- Replace getUserRole function with userUtils.getUserRole
- Maintain role-based restrictions for .pr add
- Simplify permission checking logic

#### Birthday Command (`/src/commands/birthday.ts`)
- Replace manual user queries with findUserById
- Maintain birthday setting and listing functionality
- Improve user validation

#### Daftar Command (`/src/commands/daftar.ts`)
- Use findUserById for duplicate registration checks
- Maintain security features and validation
- Improve error handling for existing users

#### XP Manager (`/src/utils/xpManager.ts`)
- Replace manual user queries with findUserById
- Maintain XP and leveling functionality
- Improve user profile retrieval

## Data Models

### User Interface (Updated)
```typescript
export interface User {
  id: number;
  whatsapp_id?: string;
  whatsapp_lid?: string;
  name: string;
  role: 'Owner' | 'Siswa' | 'Sekretaris 1' | 'Sekretaris 2' | 'Bendahara 1' | 'Bendahara 2' | 'Ketua Kelas' | 'Wakil Ketua';
  email?: string;
  birthday?: string;
  xp?: number;
  level?: number;
  created_at?: string;
}
```

### Database Query Pattern
```sql
SELECT * FROM users 
WHERE whatsapp_id = $1 OR whatsapp_lid = $1
LIMIT 1
```

## Error Handling

### User Not Found
- Return null consistently
- Let calling functions handle user-friendly messages
- Log lookup attempts for debugging

### Database Errors
- Catch and log Supabase errors
- Return null to prevent crashes
- Provide meaningful error context

### Multiple Matches
- Use LIMIT 1 to handle edge cases
- Log warnings if multiple users found
- Return first match consistently

## Testing Strategy

### Unit Tests
- Test findUserById with various user ID formats
- Test null returns for non-existent users
- Test error handling for database failures

### Integration Tests
- Test each refactored command maintains functionality
- Test permission systems work correctly
- Test XP and leveling systems function properly

### Regression Tests
- Verify all existing commands work after refactor
- Test both DM and group message scenarios
- Validate role-based access control

## Migration Strategy

### Phase 1: Create Utility
1. Create userUtils.ts with findUserById function
2. Add comprehensive error handling and logging
3. Test utility function independently

### Phase 2: Refactor Core Systems
1. Update commandHandler.ts to use new utility
2. Update xpManager.ts to use new utility
3. Test core functionality

### Phase 3: Refactor Commands
1. Update profile.ts, pr.ts, birthday.ts, daftar.ts
2. Remove duplicate user lookup code
3. Test each command individually

### Phase 4: Cleanup and Optimization
1. Remove unused functions and imports
2. Update type definitions if needed
3. Perform comprehensive testing

## Performance Considerations

### Query Optimization
- Single query replaces multiple queries in some commands
- OR clause is indexed on both whatsapp_id and whatsapp_lid
- LIMIT 1 prevents unnecessary data retrieval

### Caching Strategy
- Consider implementing user data caching for frequently accessed users
- Cache invalidation on user data updates
- Memory-efficient caching implementation

### Database Load
- Reduced total number of database queries
- Consistent query patterns improve database performance
- Better connection pooling utilization