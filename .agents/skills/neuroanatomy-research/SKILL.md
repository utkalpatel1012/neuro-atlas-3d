---
name: neuroanatomy-research
description: Expert research and validation of human neuroanatomical structures, Terminologia Anatomica 2 (TA2), FMA/UBERON IDs, sulcal/gyral landmarks, and psychiatric circuits. Use when defining new anatomical structures, mapping clinical circuits, or cross-referencing terminology.
---

# Neuroanatomy Research & Validation Skill

## Purpose
Provides authoritative guidelines and validation protocols for researching, identifying, and cataloging human brain structures, their boundaries, functional connectivity, and neuropsychiatric clinical relevance.

## Standard Reference Hierarchy
1. **Terminologia Anatomica 2 (TA2)** / **Terminologia Neuroanatomica (TNA)** (FIPAT).
2. **Foundational Model of Anatomy (FMA)** (University of Washington).
3. **Snell's Clinical Neuroanatomy (8th Edition)**.
4. **Duvernoy's The Human Brain: Surface, 3D Sectional Anatomy & Blood Supply**.
5. **Glasser et al. (Nature 2016)** Human Connectome Project Multi-Modal Parcellation (MMP 1.0).
6. **Stahl's Essential Psychopharmacology (5th Edition)** and **DSM-5-TR**.

## Canonical Naming Standard
Every structure must use the dot-delimited URI format:
`brain.<division>.<hemisphere>.<subsystem_or_lobe>.<structure>.<subpart>`

Examples:
- `brain.telencephalon.left.frontal_lobe.precentral_gyrus`
- `brain.telencephalon.left.limbic.hippocampus.ca1`
- `brain.diencephalon.bilateral.epithalamus.habenula.lateral`

## Validation Workflow
When introducing or modifying any anatomical record:
1. Confirm the official Latin name and common English equivalents from TA2.
2. Cross-reference corresponding FMA and UBERON identifiers.
3. Verify anatomical boundaries:
   - Superior, Inferior, Anterior, Posterior, Medial, Lateral relations.
4. Document vascular supply (arterial branch and venous drainage).
5. Document functional domains according to NIMH RDoC matrix.
6. Document psychiatric relevance (disorders, psychopharmacological receptor targets, neuromodulation coordinates).
7. Cite at least two primary peer-reviewed papers or benchmark textbook chapters with PMID/DOI.
