# PRD: Offline Facial Recognition + Liveness Detection for Remote Locations

## 1) Overview

This product is a **mobile-first, offline biometric verification module** for the NHAI hackathon brief: **secure facial recognition and liveness detection for remote locations**, integrated with the existing Datalake 3.0 app. The system must work **without internet**, on **mid-range Android/iOS devices**, with a **small model footprint**, **fast response**, and a **sync + purge flow** when network returns. 

The real product is not “just face recognition.” It is a complete **field authentication workflow**:

**Enroll user → store face template locally → verify offline → check liveness → save event locally → sync to AWS later → purge local sensitive data.** 

---

## 2) Goals

### Primary goals

1. Authenticate field personnel **offline** in zero-network zones. 
2. Keep the AI model **lightweight** so it does not bloat the mobile app. The brief targets about **20 MB or smaller**. 
3. Complete recognition + liveness quickly, with the target being **under 1 second** on standard mid-range devices. 
4. Support **Android 8+** and **iOS 12+** with at least **3 GB RAM**. 
5. Provide a **working prototype with source code** and a clear **technical presentation/documentation** package. 

### Product success definition

The product is successful if a judge can open the app, enroll a face, verify the same user offline, see a liveness check happen, and later see the data sync + purge flow clearly. That is what the brief is actually asking for. 

---

## 3) Scope

### In scope

* Face enrollment
* Offline face verification
* Offline liveness detection
* Local encrypted storage of templates and events
* Sync to AWS after connectivity returns
* Local data purge after sync
* Performance logging
* Cross-platform support through React Native
* Presentation and technical documentation 

### Out of scope

* Cloud-based face matching during verification
* Heavy video analytics
* SMS/OTP-based fallback auth
* Non-essential UI animations
* Large model architectures that increase app size or latency

### Why these are excluded

They would directly hurt the main constraints:

* cloud inference breaks offline operation,
* heavy video processing slows mid-range phones,
* OTP fails in zero-network zones,
* large models make the app too heavy,
* extra UI work wastes hackathon time without helping the score. 

---

## 4) User Stories

### Field staff

* As a field user, I want to authenticate my identity even when there is no internet.
* As a field user, I want the app to respond quickly so I do not lose time.
* As a field user, I want the process to be simple, with clear camera instructions.

### Supervisor / verifier

* As a supervisor, I want to enroll a user once and verify them later in the field.
* As a supervisor, I want to know whether the match was genuine and whether liveness passed.
* As a supervisor, I want records to sync later when connectivity is available.

### Admin / system owner

* As an admin, I want local biometric data to be purged after successful sync.
* As an admin, I want audit logs and timestamps.
* As an admin, I want the solution to be easy to integrate into the existing app. 

---

## 5) Functional Requirements

### FR1 — User enrollment

* Capture multiple face frames during enrollment.
* Validate face quality before saving.
* Generate and store a face embedding/template locally.
* Save metadata like user ID, timestamp, device ID, and model version.

### FR2 — Offline verification

* Open the camera.
* Detect a face in real time.
* Confirm liveness.
* Compare the live embedding with the stored template.
* Return accept/reject instantly.

### FR3 — Liveness detection

The solution must include offline anti-spoofing measures. The brief explicitly mentions examples like **blink, smile, or head turn**. 

Use:

* challenge-response gestures,
* face movement validation,
* a lightweight spoof classifier.

Do not rely only on a blink check, because that is too weak by itself.

### FR4 — Local event logging

Store each verification attempt with:

* user ID
* time
* result
* liveness score
* match score
* latency
* sync status

### FR5 — Sync mechanism

When internet returns:

* upload pending records to AWS,
* mark them as synced,
* keep retry logs,
* avoid data loss.

### FR6 — Purge mechanism

After successful sync:

* delete local sensitive biometric data,
* keep only minimal audit metadata if required by policy.

### FR7 — Performance reporting

The app must show:

* model size,
* inference latency,
* total verification time,
* device info,
* offline/online status.

This matters because the brief scores innovation, feasibility, and documentation heavily. 

---

## 6) Non-Functional Requirements

### NFR1 — Offline-first

The system must work fully without active internet.

### NFR2 — Speed

Recognition + liveness should stay under **1 second** on standard mid-range devices. 

### NFR3 — Lightweight

The model should stay near the **20 MB** target, or smaller if possible. 

### NFR4 — Compatibility

* Android 8.0+
* iOS 12+
* minimum 3 GB RAM 

### NFR5 — Accuracy

The face recognition system should target **more than 95% accuracy** and handle:

* Indian demographics,
* sunglasses / glasses,
* sunlight,
* low light,
* shadowed outdoor conditions. 

### NFR6 — Security

* local encryption,
* protected template storage,
* secure sync requests,
* data purge after sync.

### NFR7 — Maintainability

* clear folder structure,
* modular code,
* model versioning,
* easy integration into Datalake 3.0.

### NFR8 — Open-source only

No extra licensed/paid dependency should be required. The brief is explicit about open-source technologies only. 

---

## 7) Architecture

### High-level architecture

```text
┌─────────────────────────────────────────────┐
│            React Native Mobile App          │
│   (Android / iOS, Datalake 3.0 module)      │
└─────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────┐
│              Camera Capture Layer           │
│        face frame, quality, crop             │
└─────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────┐
│     Face Detection + Landmark Extraction     │
│      face box, eyes, mouth, head pose       │
└─────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────┐
│          Liveness Engine (Offline)           │
│   blink / smile / head-turn + spoof model    │
└─────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────┐
│       Face Embedding / Recognition Model     │
│     lightweight compressed edge model        │
└─────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────┐
│      Matcher + Threshold Decision Engine     │
│            accept / reject decision          │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        v                         v
┌───────────────┐        ┌───────────────────┐
│ Local Secure   │        │ Sync Queue / AWS  │
│ Database       │        │ Upload When Online│
└───────────────┘        └───────────────────┘
                                      │
                                      v
                           ┌─────────────────────┐
                           │ Purge Sensitive Data │
                           └─────────────────────┘
```

### Why this architecture

This architecture keeps everything **on-device**, which is required by the brief, and avoids any dependency on network for recognition or liveness. It also creates a clean place for **sync and purge**, which is a mandatory deliverable. 

---

## 8) Architecture details

### Data flow

1. User opens app.
2. App checks camera permission and device readiness.
3. User is enrolled or verified.
4. Face is detected locally.
5. Liveness is checked locally.
6. Face embedding is generated locally.
7. Embedding is compared with stored template locally.
8. Result is stored in the local encrypted DB.
9. If network exists, records are uploaded to AWS.
10. After server confirmation, local sensitive data is purged.

### Versioning

Include model and app version fields in every event:

* `app_version`
* `model_version`
* `liveness_model_version`
* `enrollment_version`

This is important because government-style systems need traceability. If a model changes, you must know which version produced which decision.

---

## 9) Tech Stack Final Choice

### Final stack

* **Mobile app:** React Native
* **Camera:** VisionCamera-style high-performance camera layer
* **Inference:** lightweight on-device TFLite/ONNX-style edge inference
* **Face detection / landmarks:** on-device mobile face detection
* **Liveness:** gesture-based challenge + lightweight spoof classifier
* **Local storage:** encrypted local database
* **Sync layer:** AWS upload API after connectivity returns
* **Build target:** Android + iOS

### Why this stack

This stack is the best balance of:

* offline operation,
* fast response,
* small footprint,
* cross-platform support,
* hackathon speed,
* integration readiness.

### Why not a heavier stack

Do not use:

* cloud-only APIs,
* large transformer vision models,
* server-side face matching,
* complex microservices for the prototype.

Those choices would slow delivery and weaken the exact hackathon constraints.

---

## 10) Risks

### Risk 1 — Model too large

**Problem:** app becomes heavy and slow.
**Mitigation:** use quantization, pruning, and a small embedding model.

### Risk 2 — Liveness too weak

**Problem:** blink-only checks can be fooled.
**Mitigation:** combine challenge-response with a spoof classifier.

### Risk 3 — Poor lighting / outdoor noise

**Problem:** recognition drops in sunlight or shadow.
**Mitigation:** use face-quality checks, capture guidance, and data augmentation.

### Risk 4 — Mid-range device performance

**Problem:** inference becomes slow.
**Mitigation:** optimize frame processing, keep image size low, and avoid unnecessary work per frame.

### Risk 5 — Sync failure

**Problem:** records may not upload cleanly later.
**Mitigation:** queue-based retry logic and server ack before purge.

### Risk 6 — Privacy concerns

**Problem:** biometric data is sensitive.
**Mitigation:** encrypt local storage and purge after sync.

---

## 11) Acceptance Criteria

The prototype is acceptable only if:

1. It runs on Android and iOS using React Native. 
2. It works fully offline. 
3. It performs face recognition + liveness quickly on mid-range devices. 
4. The AI model remains lightweight and does not bloat the app. 
5. It supports a sync-to-AWS flow after network returns. 
6. It purges local sensitive data after successful sync. 
7. The source code is shared and documented. 
8. The final submission includes a PPT/PDF and technical documentation. 

---

# Execution Plan

## 1) Final architecture diagram

```text
User
  ↓
React Native App
  ↓
Camera + Face Detection
  ↓
Liveness Check
  ↓
Face Embedding Model
  ↓
Matcher / Threshold
  ↓
Result + Local Storage
  ↓
Sync Queue → AWS
  ↓
Purge Local Sensitive Data
```

---

## 2) Module list

### Module A — App shell

Navigation, screens, permissions, state management.

### Module B — Enrollment module

Capture user face, validate quality, save embedding.

### Module C — Verification module

Offline camera capture, face match, result display.

### Module D — Liveness module

Blink, smile, head turn, spoof check.

### Module E — Local database module

Encrypted storage for profiles, events, sync states.

### Module F — Sync module

Upload queued records after connectivity returns.

### Module G — Purge module

Delete sensitive data after server confirmation.

### Module H — Benchmark module

Show model size, latency, and success/failure reason.

---

## 3) Timeline

### Day 1: Planning and repo setup

* Freeze scope
* Create folder structure
* Choose model strategy
* Build wireframes
* Set performance targets

### Day 2: Camera and face detection

* Camera preview
* Face box detection
* Basic face quality checks

### Day 3: Enrollment flow

* Capture face
* Generate template
* Save locally

### Day 4: Verification flow

* Match live face with stored template
* Show accept/reject result

### Day 5: Liveness flow

* Blink/smile/head turn challenge
* Add spoof classifier hook

### Day 6: Storage and sync

* Local DB
* Sync queue
* AWS upload stub
* Purge logic

### Day 7: Optimization

* Model compression
* Latency tuning
* Memory checks

### Day 8: Testing

* Low light
* Bright sunlight
* Mid-range Android
* iPhone test
* Offline mode

### Day 9: Documentation and PPT

* Architecture slide
* Flow slide
* Metrics slide
* Risks slide
* Demo script

### Day 10: Final demo prep

* Bug fixes
* Rehearsal
* Edge-case checks
* Final source cleanup

---

## 4) Build priority order

1. Offline verification
2. Liveness
3. Local storage
4. Sync/purge
5. Performance tuning
6. Documentation

Do not start with fancy UI. That is wasted time. First prove the core pipeline works.

---

 
