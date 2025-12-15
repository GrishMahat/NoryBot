
import { describe, expect, test } from 'bun:test';
import { hashCommand, canonicalizeCommand } from '../src/utils/helpers/commandHasher';
import { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';

describe('Command Hasher', () => {
    test('should produce stable hash for same input', () => {
        const cmd1 = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test command')
        };
        const cmd2 = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test command')
        };
        
        expect(hashCommand(cmd1 as any)).toBe(hashCommand(cmd2 as any));
    });

    test('should ignore context order', () => {
        const cmd1 = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test')
                .setContexts([0, 1, 2])
        };
        const cmd2 = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test')
                .setContexts([2, 0, 1])
        };
        
        expect(hashCommand(cmd1 as any)).toBe(hashCommand(cmd2 as any));
    });

    test('should handle default integration types', () => {
        // Local command with no integration types (defaults to [0])
        const local = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test')
        };

        // Remote command with explicit [0]
        const remote = {
            name: 'test',
            description: 'test',
            type: 1,
            integration_types: [0], // discord API uses snake_case, but let's check both
            options: [],
        } as any;

        // Hasher for remote should treat explicit [0] same as implicit undefined->[0] for local
        // Wait, local builder toJSON doesn't have integration_types if not set.
        // My hasher logic: const rawIntegrationTypes = (data as any).integration_types ?? (data as any).integrationTypes;
        // const integration_types = normalizeArray(rawIntegrationTypes, [0]);
        // So both should result in [0].

        expect(hashCommand(local as any)).toBe(hashCommand(remote));
    });

    test('should handle default dm_permission derived from contexts', () => {
        // Case 1: All contexts -> dm_permission = true
        const localAllContexts = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test')
                .setContexts([0, 1, 2])
        };
        
        // Remote equivalent
        const remoteAllContexts = {
            name: 'test',
            description: 'test',
            type: 1,
            options: [],
            contexts: [0, 1, 2],
            dm_permission: true
        } as any;

         expect(hashCommand(localAllContexts as any)).toBe(hashCommand(remoteAllContexts));

        // Case 2: Guild only -> dm_permission = false
        const localGuildOnly = {
            data: new SlashCommandBuilder()
                .setName('test')
                .setDescription('test')
                .setContexts([0])
        };

        const remoteGuildOnly = {
            name: 'test',
            description: 'test',
            type: 1,
            options: [],
            contexts: [0],
            dm_permission: false
        } as any;

        expect(hashCommand(localGuildOnly as any)).toBe(hashCommand(remoteGuildOnly));
    });

    test('should match local builder vs remote object for options', () => {
        const local = {
            data: new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Pong!')
                .addStringOption(option => 
                    option.setName('input')
                        .setDescription('The input to echo back')
                        .setRequired(true))
        };

        const remote = {
            name: 'ping',
            description: 'Pong!',
            type: 1,
            contexts: [0, 1, 2], // Default
            integration_types: [0], // Default
            dm_permission: true, // Default
            options: [
                {
                    type: 3, // String
                    name: 'input',
                    description: 'The input to echo back',
                    required: true,
                    // autocomplete default false
                }
            ]
        } as any;

        const h1 = hashCommand(local as any);
        const h2 = hashCommand(remote);

        if (h1 !== h2) {
             console.log('Local Canonical:', JSON.stringify(canonicalizeCommand(local as any), null, 2));
             console.log('Remote Canonical:', JSON.stringify(canonicalizeCommand(remote), null, 2));
        }

        expect(h1).toBe(h2);
    });
});
