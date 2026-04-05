<script lang="ts">
  interface QuestionOption {
    id: string;
    label: string;
    description: string;
  }

  interface Question {
    id: string;
    question: string;
    type: string;
    required: boolean;
    context?: string;
    options?: QuestionOption[];
  }

  interface QuestionnaireData {
    context?: string;
    questions?: Question[];
    estimated_completion_time?: string;
  }

  interface Props {
    data: QuestionnaireData;
    responses: Record<string, string>;
    onResponse: (questionId: string, response: string) => void;
    onSubmit: () => void;
  }

  let { data, responses, onResponse, onSubmit }: Props = $props();

  function isCompleted(questionId: string): boolean {
    return String(responses[questionId] ?? '').trim().length > 0;
  }
</script>

<div
  class="overflow-hidden rounded-lg border border-border bg-gradient-to-br from-card to-card/80 shadow-md backdrop-blur-sm">
  <!-- Header -->
  <div class="relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"></div>
    <div
      class="relative flex h-8 flex-none items-center justify-between border-b border-border/30 bg-card/80 p-2 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div class="flex items-center gap-1.5">
        <div
          class="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/80 shadow-sm">
          <svg
            class="h-2.5 w-2.5 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-xs font-semibold text-card-foreground">Interactive Questionnaire</h3>
          {#if data.estimated_completion_time}
            <p class="text-[9px] text-muted-foreground/80">{data.estimated_completion_time}</p>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="space-y-3 p-3">
    <!-- Context -->
    {#if data.context}
      <div
        class="rounded border border-border bg-gradient-to-r from-muted/50 to-muted/30 p-2 backdrop-blur-sm">
        <div class="flex items-start gap-1.5">
          <svg
            class="mt-0.5 h-3.5 w-3.5 text-muted-foreground/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-[10px] leading-relaxed text-muted-foreground/90">{data.context}</p>
        </div>
      </div>
    {/if}

    <!-- Questions -->
    <div class="space-y-2">
      {#each data.questions || [] as question (question.id)}
        {@const completed = isCompleted(question.id)}
        {@const responseValue = responses[question.id]}
        <div
          class="group relative rounded-lg border {completed
            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/[0.02]'
            : 'border-border bg-card/50'} overflow-hidden transition-all duration-300 hover:border-border hover:shadow-sm">
          <div class="p-3">
            <div class="flex items-start gap-2">
              <!-- Status indicator -->
              <div class="relative mt-0.5">
                <div
                  class="h-3.5 w-3.5 rounded-full border-2 {completed
                    ? 'border-primary bg-gradient-to-br from-primary to-primary/80 shadow-sm'
                    : 'border-border bg-background'} flex flex-shrink-0 items-center justify-center transition-all duration-300">
                  {#if completed}
                    <svg
                      class="animate-fade-in h-2 w-2 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                    </svg>
                  {/if}
                </div>
                {#if completed}
                  <div class="absolute -inset-1 animate-ping rounded-full bg-primary/20"></div>
                {/if}
              </div>

              <div class="min-w-0 flex-1">
                <!-- Question header -->
                <div class="mb-1.5 flex items-center gap-1.5">
                  <span class="text-xs leading-tight font-semibold text-card-foreground"
                    >{question.question}</span>
                  {#if question.required}
                    <span
                      class="inline-flex items-center rounded border border-destructive bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive"
                      >Required</span>
                  {/if}
                  <span
                    class="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium {completed
                      ? 'border border-primary bg-gradient-to-r from-primary/10 to-primary/5 text-primary'
                      : 'border border-border bg-muted/50 text-muted-foreground'}">
                    {completed ? '✓ Completed' : '○ Pending'}
                  </span>
                </div>

                <!-- Question context -->
                {#if question.context && question.context.trim()}
                  <div class="mb-2 rounded bg-muted/30 p-1.5">
                    <p class="text-[9px] leading-relaxed text-muted-foreground/80">
                      {question.context}
                    </p>
                  </div>
                {/if}

                <!-- Multiple choice options -->
                {#if question.type === 'multiple_choice' && question.options}
                  <div class="space-y-1.5">
                    {#each question.options as option (option.id)}
                      <button
                        type="button"
                        class="group/option w-full rounded border border-border p-2 text-left transition-all duration-200 {responseValue ===
                        option.label
                          ? 'border-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm'
                          : 'border-border bg-muted/20 hover:border-border hover:bg-muted/30'}"
                        onclick={() => onResponse(question.id, option.label)}>
                        <div class="flex items-center gap-2">
                          <div class="relative">
                            <div
                              class="h-3.5 w-3.5 rounded-full border-2 {responseValue ===
                              option.label
                                ? 'border-primary bg-gradient-to-br from-primary to-primary/80'
                                : 'border-border bg-background'} flex items-center justify-center transition-all duration-200">
                              {#if responseValue === option.label}
                                <div
                                  class="animate-fade-in h-1.5 w-1.5 rounded-full bg-primary-foreground">
                                </div>
                              {/if}
                            </div>
                            {#if responseValue === option.label}
                              <div
                                class="absolute -inset-1 animate-ping rounded-full bg-primary/20">
                              </div>
                            {/if}
                          </div>
                          <div class="flex-1">
                            <span
                              class="text-xs font-medium text-card-foreground transition-colors group-hover/option:text-primary"
                              >{option.label}</span>
                            {#if option.description && option.description.trim()}
                              <p class="mt-0.5 text-[9px] leading-relaxed text-muted-foreground/70">
                                {option.description}
                              </p>
                            {/if}
                          </div>
                        </div>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Submit Button -->
    <div class="flex justify-end border-t border-border pt-1.5">
      <button
        type="button"
        onclick={onSubmit}
        class="inline-flex h-7 transform items-center justify-center gap-1.5 rounded bg-gradient-to-r from-primary to-primary/90 px-3 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow transition-all duration-200 outline-none hover:scale-[1.02] hover:from-primary/90 hover:to-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        Submit Responses
      </button>
    </div>
  </div>
</div>
