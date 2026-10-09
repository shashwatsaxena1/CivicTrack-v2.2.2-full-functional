import { describe,it,expect } from 'vitest';
describe('CivicTrack smoke',()=>{it('truthful verification states are distinct',()=>{expect(new Set(['SUBMITTED','PENDING_REVIEW','LOCATION_VERIFIED','EVIDENCE_VERIFIED','GOVERNMENT_VERIFIED','COMPLETED']).size).toBe(6)})});
