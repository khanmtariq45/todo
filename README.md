### Purpose

The purpose of this document is to outline the methodology and processes we will employ to enhance the execution tracking and performance of our backend systems. This involves creating a robust mechanism to monitor function execution, handle potential deadlocks, and improve logging and traceability within our systems. By implementing these measures, we aim to achieve more reliable and efficient backend operations, particularly in the context of sending RFQs (Request for Quotations).

### Scope

This document covers the following aspects:

1. **Execution Tracking**:
    - Establishing a list to track executed functions for monitoring purposes.
    - Implementing a retry mechanism to handle session kills or deadlocks, with a maximum of three retries.
    - Utilizing the list to resume execution from the last completed step in case of a retry.

2. **Deadlock Handling**:
    - Detailed steps for detecting and resolving deadlocks.
    - Criteria for stopping the process if the deadlock persists after three retries.

3. **Performance Enhancement**:
    - Improving the Send RFQ backend code to enhance execution performance.
    
4. **Logging and Traceability**:
    - Enhancing logging mechanisms across all stored procedures involved in sending RFQs.
    - Adding detailed logging steps to improve traceability.
    - Storing detailed error information in the `inf_log` table to identify the exact step where errors occur during transaction rollbacks.

By addressing these areas, we intend to bolster the reliability, performance, and transparency of our backend systems, ultimately leading to more robust and maintainable software solutions.