INSERT INTO ip_core (company_id, title, description, part_number, type, maturity_level, compatibility, license_id, created_by, created_at, updated_at)
VALUES
  (1, 'Neural Network Accelerator v2.1', 'High-performance GPU kernel for deep learning inference', 'NN-ACC-2021', 'hardware', 'production', 'x86-64, ARM64', 1, 4, NOW(), NOW()),
  (1, 'RISC-V Processor Core', 'Open-source ISA compatible CPU design with 64-bit support', 'RISCV-64-001', 'hardware', 'beta', 'RISC-V ISA', 2, 4, NOW(), NOW()),
  (1, 'Memory Cache Controller', 'L3 cache management system with 16MB capacity', 'MCC-16M-001', 'hardware', 'production', 'DDR4/DDR5', 1, 4, NOW(), NOW()),
  (1, 'Image Signal Processor', 'ISP for 4K video capture and processing pipeline', 'ISP-4K-PRO', 'hardware', 'production', 'MIPI CSI-2', 1, 4, NOW(), NOW()),
  (1, 'USB 3.1 PHY Controller', 'Physical layer interface for USB Type-C connectivity', 'USB31-PHY-001', 'hardware', 'production', 'USB 3.1 Gen2', 1, 4, NOW(), NOW()),
  (1, 'Cryptographic Engine', 'AES-256 and SHA-512 hardware accelerator module', 'CRYPT-ENG-001', 'hardware', 'production', 'NIST FIPS', 3, 4, NOW(), NOW()),
  (1, 'Real-Time OS Kernel', 'Preemptive multitasking kernel with sub-millisecond latency', 'RTOS-KERN-3.0', 'software', 'production', 'ARM Cortex-M, ARM Cortex-A', 1, 4, NOW(), NOW()),
  (1, 'ML Framework Optimizer', 'TensorFlow/PyTorch optimization and quantization library', 'ML-OPT-2.4', 'software', 'beta', 'Python 3.8+, C++17', 2, 4, NOW(), NOW()),
  (1, 'Video Codec Library', 'Hardware-optimized H.265/HEVC and VP9 encoder/decoder', 'CODEC-HW-1.8', 'software', 'production', 'H.265/HEVC, VP9, AV1', 3, 4, NOW(), NOW()),
  (1, 'IoT Middleware Stack', 'MQTT/CoAP protocol implementation with security framework', 'IOT-MW-5.1', 'software', 'beta', 'Linux, RTOS, Bare Metal', 1, 4, NOW(), NOW());

SELECT COUNT(*) as total_ips FROM ip_core;
