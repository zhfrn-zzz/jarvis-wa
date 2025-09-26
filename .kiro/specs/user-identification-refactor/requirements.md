# Requirements Document

## Introduction

This specification outlines the refactoring of the user identification system in the Jarvis Bot project to create a more consistent and reliable user lookup mechanism across all commands and utilities.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a centralized user identification utility, so that all commands use consistent logic for finding users in the database.

#### Acceptance Criteria

1. WHEN a command needs to identify a user THEN the system SHALL use a single centralized function
2. WHEN looking up a user THEN the system SHALL check both whatsapp_id and whatsapp_lid columns using OR logic
3. WHEN a user is found THEN the system SHALL return complete user data including id, name, role, xp, level, birthday
4. WHEN a user is not found THEN the system SHALL return null consistently

### Requirement 2

**User Story:** As a bot user, I want consistent user identification across all commands, so that my permissions and data are recognized regardless of whether I'm in a group or DM.

#### Acceptance Criteria

1. WHEN a user sends a command from DM THEN the system SHALL find them using whatsapp_id
2. WHEN a user sends a command from group THEN the system SHALL find them using whatsapp_lid
3. WHEN the system cannot determine user context THEN it SHALL check both ID types
4. WHEN user data is found THEN all commands SHALL have access to the same user information

### Requirement 3

**User Story:** As a developer, I want all existing commands refactored to use the new utility, so that there is no duplicate user lookup logic throughout the codebase.

#### Acceptance Criteria

1. WHEN refactoring profile.ts THEN the system SHALL replace manual user queries with findUserById
2. WHEN refactoring pr.ts THEN the system SHALL replace getUserRole function with findUserById
3. WHEN refactoring birthday.ts THEN the system SHALL use findUserById for user validation
4. WHEN refactoring daftar.ts THEN the system SHALL use findUserById for duplicate registration checks
5. WHEN refactoring commandHandler.ts THEN the system SHALL use findUserById for role checking
6. WHEN refactoring xpManager.ts THEN the system SHALL use findUserById for user lookup

### Requirement 4

**User Story:** As a system administrator, I want improved error handling and logging, so that user identification issues can be debugged more effectively.

#### Acceptance Criteria

1. WHEN findUserById is called THEN the system SHALL log the lookup attempt for debugging
2. WHEN a user is not found THEN the system SHALL provide clear error messages
3. WHEN database errors occur THEN the system SHALL handle them gracefully
4. WHEN multiple users match THEN the system SHALL handle the conflict appropriately

### Requirement 5

**User Story:** As a developer, I want backward compatibility maintained, so that existing functionality continues to work after refactoring.

#### Acceptance Criteria

1. WHEN commands are refactored THEN all existing command functionality SHALL remain intact
2. WHEN user permissions are checked THEN the role-based access control SHALL work as before
3. WHEN XP is awarded THEN the leveling system SHALL continue to function
4. WHEN birthday features are used THEN the birthday system SHALL work correctly
5. WHEN registration occurs THEN the daftar command SHALL maintain all security features