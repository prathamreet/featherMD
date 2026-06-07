# Feather MD — Math + Diagrams Test Sheet

### 1.1 Maxwell's equations (display, aligned)

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

### 1.2 Schrödinger equation (time-dependent)

$$
i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \left[ -\frac{\hbar^2}{2m} \nabla^2 + V(\mathbf{r}, t) \right] \Psi(\mathbf{r}, t)
$$

### 1.3 Cauchy's residue theorem

$$
\oint_{\gamma} f(z)\, dz = 2\pi i \sum_{k=1}^{n} \operatorname{Res}(f, a_k)
$$

### 1.4 Fourier transform pair

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\, e^{-2\pi i x \xi}\, dx
\qquad
f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi)\, e^{2\pi i x \xi}\, d\xi
$$

### 1.5 Matrix and determinant

$$
A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}, \qquad \det(A) = ad - bc
$$

### 1.6 Beta function

$$
B(x, y) = \int_0^1 t^{x-1}(1-t)^{y-1}\, dt
$$

### 1.7 Binomial coefficient with summation

$$
\sum_{k=0}^{n} \binom{n}{k} x^{k} = (1 + x)^n
$$

### 1.8 Quadratic formula

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

### 1.9 Limit definition of $e$

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### 1.10 Inline math, scattered through prose

Einstein's mass–energy equivalence is $E = mc^2$, the Pythagorean identity is $a^2 + b^2 = c^2$, Euler's identity is $e^{i\pi} + 1 = 0$, and the golden ratio satisfies $\varphi = \tfrac{1 + \sqrt{5}}{2}$. A simple fraction like $\tfrac{1}{2}$ should sit inline cleanly.

### 1.11 Sub/superscripts

$$
x_1^2 + x_2^2 + \cdots + x_n^2 = \sum_{i=1}^{n} x_i^2
$$

### 1.12 Greek letters and operators (smoke test)

$\alpha, \beta, \gamma, \delta, \epsilon, \zeta, \eta, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega$ — and $\le, \ge, \neq, \approx, \in, \notin, \subset, \cup, \cap, \to, \Rightarrow, \forall, \exists$.

---
### 2.1 Two-node flowchart

```mermaid
flowchart LR
  A[Start] --> B[End]
```

### 2.2 Decision flowchart

```mermaid
flowchart TD
  A[Write in Markdown] --> B{Preview looks good?}
  B -- Yes --> C[Save the file]
  B -- No --> D[Edit]
  D --> A
```

### 2.3 Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant E as Editor
  participant P as Preview
  U->>E: Type markdown
  E->>P: Debounced render (150 ms)
  P-->>U: Updated preview
```

### 2.4 Class diagram

```mermaid
classDiagram
  class Document {
    +String path
    +String content
    +Boolean isDirty
    +save()
    +reload()
  }
  class Editor {
    +setValue(text)
    +getValue() String
  }
  class Preview {
    +renderMarkdown(md)
    +refreshForThemeChange()
  }
  Editor --> Document : edits
  Preview --> Document : renders
```

### 2.5 State diagram

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Typing : key press
  Typing --> Debouncing : keyup
  Debouncing --> Rendering : 150 ms elapsed
  Rendering --> Idle : DOM updated
  Idle --> Saving : Ctrl+S
  Saving --> Idle : write complete
```

### 2.6 ER diagram

```mermaid
erDiagram
  USER ||--o{ DOCUMENT : owns
  DOCUMENT ||--|{ REVISION : has
  USER {
    string id
    string name
  }
  DOCUMENT {
    string path
    string title
    boolean dirty
  }
  REVISION {
    string id
    datetime created_at
    string author
  }
```

### 2.7 Gantt chart

```mermaid
gantt
  title FeatherMD release plan
  dateFormat YYYY-MM-DD
  section Core
  KaTeX integration        :done,    k1, 2026-06-01, 3d
  Mermaid integration      :active,  m1, 2026-06-04, 4d
  section Polish
  Theme parity for diagrams: p1, after m1, 2d
  Test sweep               : p2, after p1, 2d
  Release notes            : p3, after p2, 1d
```

### 2.8 Pie chart

```mermaid
pie title FeatherMD installer composition (approx)
  "Tauri shell" : 5.0
  "CodeMirror + marked" : 1.2
  "Mermaid" : 1.3
  "KaTeX + fonts" : 0.4
  "Highlight.js (lazy)" : 0.3
  "Other" : 0.4
```

### 2.9 Complex multi-subgraph flowchart

```mermaid
flowchart TB
  subgraph Editor
    A[CodeMirror 6]
    A1[updateListener]
    A --> A1
  end

  subgraph Pipeline["Preview pipeline"]
    direction LR
    M[marked.parse] --> S[DOMPurify.sanitize]
    S --> H[innerHTML]
    H --> Post{Post-sanitize pass}
    Post -- code blocks --> HL[highlight.js lazy]
    Post -- math --> K[KaTeX lazy]
    Post -- mermaid --> Md[Mermaid lazy]
  end

  subgraph Native["Tauri shell"]
    F[file-io]
    W[notify watcher]
    F <--> W
  end

  A1 -- 150ms debounce --> M
  H --> Scroll[ratio scroll sync]
  F --> A
```

### 2.10 Git graph

```mermaid
gitGraph
  commit id: "init"
  commit id: "editor"
  branch feat/mermaid
  checkout feat/mermaid
  commit id: "katex"
  commit id: "mermaid"
  commit id: "theme parity"
  checkout main
  merge feat/mermaid
  commit id: "1.8.0"
```
