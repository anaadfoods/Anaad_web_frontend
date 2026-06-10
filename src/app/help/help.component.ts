import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserQueriesService, UserQueryPayload } from '../core/services/user-queries.service';
import { LogService } from '../core/services/log.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface FaqItem {
  question: string;
  answer: string;
  category: 'general' | 'orders' | 'subscriptions' | 'rfp';
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userQueriesService = inject(UserQueriesService);
  private readonly logSvc = inject(LogService);
  private readonly destroyRef = inject(DestroyRef);

  // FAQ list
  readonly faqs: FaqItem[] = [
    {
      category: 'general',
      question: 'What makes ANAAD grains different from organic grains?',
      answer: "Unlike generic 'organic' food which often relies on industrial monoculture and chemical-lite substitutes, ANAAD grains are grown using Indian Cow-Based Natural (ICBN) farming. We focus on soil regeneration, crop diversity, and zero chemical inputs. Our heritage seeds are hand-harvested and stone-ground to preserve nutrients and ancient flavor profiles."
    },
    {
      category: 'general',
      question: 'What is ICBN farming?',
      answer: 'ICBN (Indian Cow-Based Natural) farming is a traditional, biodynamic agricultural methodology that uses formulations made from the dung and urine of indigenous cow breeds (like Gir and Sahiwal) along with local organic materials. This introduces rich microbial life back into the soil, naturalizing nutrients and eliminating any need for synthetic fertilizers or pesticides.'
    },
    {
      category: 'general',
      question: 'How can I verify the purity of my grains?',
      answer: 'Every batch of grains we harvest is individually tested by SGS India for residue status. We log these lab analysis reports in our Open Lab Ledger (The Registry). You can look up the batch number printed on your package to view its specific soil history, harvest date, milling details, and pesticide clearance cert.'
    },
    {
      category: 'orders',
      question: 'How long does it take for my order to arrive?',
      answer: 'To ensure maximum freshness, we stone-grind our flours only after receiving your order. Dispatches occur within 48 to 72 hours of milling. Deliveries typically arrive within 2–5 business days depending on your location. You will receive real-time tracking links via SMS and email.'
    },
    {
      category: 'orders',
      question: 'Do you ship across India?',
      answer: 'Yes, we ship to all major cities and serviceable pincodes across India through our premium courier partners. Delivery charges are calculated dynamically at checkout based on package weight and destination.'
    },
    {
      category: 'orders',
      question: 'What is your return or replacement policy?',
      answer: 'If you receive a damaged, incomplete, or incorrect package, please contact us within 48 hours of delivery with photos of the issue. We will arrange a free replacement or issue a full refund within 5 business days, with no questions asked.'
    },
    {
      category: 'subscriptions',
      question: 'How do ANAAD grain subscriptions work?',
      answer: "Our CBA (Community Backed Agriculture) subscriptions allow you to lock in a dedicated harvest share of heritage grains. You choose your grain selection, quantity, and delivery frequency. This guarantees your family's grain supply for the season and helps our farmers plan their crop cycles with financial security."
    },
    {
      category: 'subscriptions',
      question: 'Can I pause, modify, or cancel my subscription?',
      answer: "Yes. You have complete flexibility. You can pause dispatches, change grain quantities, skip a month, or cancel your subscription at any time directly from the 'Subscriptions' tab in your Profile page. There are no lock-in periods or cancellation fees."
    },
    {
      category: 'subscriptions',
      question: 'How is subscription billing handled?',
      answer: "Subscription billing is automatic and runs securely through our payment gateway. You are billed at the beginning of each dispatch cycle. If a payment fails, we'll notify you and attempt a re-try before placing the dispatch on hold."
    },
    {
      category: 'rfp',
      question: 'What is the Remote Farming Program (RFP)?',
      answer: 'The Remote Farming Program is an initiative that allows families and businesses to sponsor a dedicated mini-farm plot or partner in contract farming with ANAAD. You can select your heirloom crops, receive regular video updates from the field, and get the entire harvest delivered directly to your doorstep. It bridges the gap between urban homes and agricultural roots.'
    },
    {
      category: 'rfp',
      question: 'How do I sign up for RFP?',
      answer: 'Visit the RFP page to view available farm tiers and plans. Submit an inquiry form, and our coordinator will contact you within 72 hours to walk you through crop selection, land allocation, and contract agreement details.'
    }
  ];

  // Search and Category Signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('all');
  activeQuestionIndex = signal<number | null>(null);

  // Form Submission Signals
  submitting = signal<boolean>(false);
  success = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Computed FAQs based on search and category
  filteredFaqs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.faqs.filter((faq, idx) => {
      const matchesCategory = category === 'all' || faq.category === category;
      const matchesSearch = !query || 
        faq.question.toLowerCase().includes(query) || 
        faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  // Support Form Definition
  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    requirementType: ['INDIVIDUAL', Validators.required],
    businessOrFamilyName: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
    isFromRfp: [false]
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // Listen to requirementType changes to conditionally require businessOrFamilyName
    this.form.get('requirementType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const nameControl = this.form.get('businessOrFamilyName');
        if (type === 'FAMILY' || type === 'BUSINESS') {
          nameControl?.setValidators([Validators.required, Validators.minLength(2)]);
        } else {
          nameControl?.clearValidators();
        }
        nameControl?.updateValueAndValidity();
      });
  }

  // Handle accordion toggle
  toggleAccordion(index: number): void {
    if (this.activeQuestionIndex() === index) {
      this.activeQuestionIndex.set(null);
    } else {
      this.activeQuestionIndex.set(index);
    }
  }

  // Handle search input
  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.activeQuestionIndex.set(null); // Close any open accordion on new search
  }

  // Set active FAQ category
  setCategory(category: string): void {
    this.selectedCategory.set(category);
    this.activeQuestionIndex.set(null); // Close accordion on category switch
  }

  // Handle Form Submission
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.success.set(false);
    this.errorMessage.set('');

    const val = this.form.value;
    const payload: UserQueryPayload = {
      name: val.fullName || '',
      phone_number: val.phoneNumber || '',
      email: val.email || '',
      message: val.message || '',
      requirement_type: val.requirementType || 'INDIVIDUAL',
      business_or_family_name: val.businessOrFamilyName || '',
      is_from_rfp: !!val.isFromRfp,
      redirection_from: val.isFromRfp ? 'RFP' : 'USER_QUERY'
    };

    this.logSvc.debug('Help screen submitting user query payload:', payload);

    this.userQueriesService.submitQuery(payload).subscribe({
      next: (res) => {
        this.logSvc.debug('Help screen query submitted successfully:', res);
        this.success.set(true);
        this.submitting.set(false);
        this.form.reset({
          requirementType: 'INDIVIDUAL',
          isFromRfp: false
        });
      },
      error: (err) => {
        this.logSvc.error('Help screen query submission failed:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to submit query. Please check your connection and try again.');
        this.submitting.set(false);
      }
    });
  }
}
