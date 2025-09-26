# Implementation Plan

- [ ] 1. Create centralized user utility module
  - Create `/src/utils/userUtils.ts` with findUserById function
  - Implement OR-based query logic for whatsapp_id and whatsapp_lid
  - Add comprehensive error handling and logging
  - Create getUserRole helper function for quick role lookup
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Update core command handler system
  - Refactor `/src/handlers/commandHandler.ts` to use userUtils.getUserRole
  - Replace existing getUserRole function with import from userUtils
  - Maintain existing permission checking logic
  - Improve error messages for unauthorized access
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Refactor XP management system
  - Update `/src/utils/xpManager.ts` to use findUserById
  - Replace manual user queries in addXp function
  - Replace manual user queries in getUserProfile functions
  - Maintain existing XP and leveling functionality
  - _Requirements: 3.6_

- [ ] 4. Refactor profile command
  - Update `/src/commands/profile.ts` to use findUserById
  - Replace getUserProfile and getUserProfileByName functions
  - Simplify user data retrieval logic
  - Maintain existing display formatting and functionality
  - _Requirements: 3.1_

- [ ] 5. Refactor PR command permissions
  - Update `/src/commands/pr.ts` to use userUtils.getUserRole
  - Remove duplicate getUserRole function from pr.ts
  - Maintain role-based restrictions for .pr add command
  - Simplify permission checking logic
  - _Requirements: 3.2_

- [ ] 6. Refactor birthday command user validation
  - Update `/src/commands/birthday.ts` to use findUserById
  - Replace manual user queries in setBirthday function
  - Maintain birthday setting and listing functionality
  - Improve user validation and error handling
  - _Requirements: 3.3_

- [ ] 7. Refactor registration command security
  - Update `/src/commands/daftar.ts` to use findUserById
  - Replace manual user queries for duplicate registration checks
  - Maintain all security features and validation logic
  - Improve error handling for existing users
  - _Requirements: 3.4_

- [ ] 8. Update additional commands using user data
  - Review and update `/src/commands/setname.ts` to use findUserById
  - Review and update `/src/commands/setid.ts` to use findUserById
  - Review and update `/src/commands/debug.ts` to use findUserById
  - Ensure consistent user identification across all commands
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Test refactored functionality
  - Test findUserById function with various user ID formats
  - Test all refactored commands maintain existing functionality
  - Test permission systems work correctly after refactor
  - Test XP and leveling systems function properly
  - Verify both DM and group message scenarios work
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Clean up and optimize codebase
  - Remove unused user lookup functions from individual files
  - Remove duplicate imports and dependencies
  - Update type definitions if needed
  - Add comprehensive error logging for debugging
  - _Requirements: 4.1, 4.2, 4.3, 4.4_