// ===== MODERN JAVASCRIPT ARCHITECTURE =====

// ===== CONFIGURATION =====
const CONFIG = {
    LOCAL_STORAGE: {
        MEASUREMENTS_KEY: 'bandra_measurements',
        APPOINTMENTS_KEY: 'bandra_appointments',
        AUTO_SAVE_PREFIX: 'bandra_autosave_'
    },
    VALIDATION: {
        NAME: { min: 2, max: 50, pattern: /^[a-zA-Z\s]+$/ },
        EMAIL: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        PHONE: { pattern: /^[\+\d\-\s\(\)]+$/ },
        DATE: { min: new Date().toISOString().split('T')[0] }
    },
    ANIMATION: {
        DURATION: 300,
        EASING: 'ease-out'
    },
    WHATSAPP: {
        NUMBER: '+94769647757',
        MESSAGE: 'Hello Bandra Tailores, I would like to inquire about your saree blouse tailoring services.'
    }
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
    // Validation functions
    validateEmail: (email) => CONFIG.VALIDATION.EMAIL.pattern.test(email),
    validatePhone: (phone) => CONFIG.VALIDATION.PHONE.pattern.test(phone),
    validateName: (name) => {
        const trimmed = name.trim();
        return trimmed.length >= CONFIG.VALIDATION.NAME.min && 
               trimmed.length <= CONFIG.VALIDATION.NAME.max &&
               CONFIG.VALIDATION.NAME.pattern.test(trimmed);
    },
    validateDate: (date) => {
        const selected = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected >= today;
    },
    
    // String utilities
    sanitizeInput: (input) => input.trim().replace(/[<>]/g, ''),
    formatPhone: (phone) => phone.replace(/[^\d+\-]/g, ''),
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    
    // DOM utilities
    createElement: (tag, className, content) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.innerHTML = content;
        return element;
    },
    
    showError: (element, message) => {
        element.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
        element.style.display = 'block';
    },
    
    showSuccess: (element, message) => {
        element.innerHTML = `<div class="success-message"><i class="fas fa-check-circle"></i> ${message}</div>`;
        element.style.display = 'block';
    },
    
    clearMessage: (element) => {
        element.innerHTML = '';
        element.style.display = 'none';
    },
    
    // Animation utilities
    animateElement: (element, animation, duration = CONFIG.ANIMATION.DURATION) => {
        element.style.animation = `${animation} ${duration}ms ${CONFIG.ANIMATION.EASING}`;
        setTimeout(() => element.style.animation = '', duration);
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// ===== LOCAL STORAGE MANAGER =====
class LocalStorageManager {
    constructor() {
        this.measurements = this.loadData('measurements');
        this.appointments = this.loadData('appointments');
        this.init();
    }

    init() {
        // Check storage availability
        if (!this.isStorageAvailable()) {
            console.warn('Local storage not available');
            return;
        }
        
        // Clean up old data periodically
        this.cleanup();
    }

    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    loadData(type) {
        try {
            const data = localStorage.getItem(CONFIG.LOCAL_STORAGE[type.toUpperCase() + '_KEY']);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            return [];
        }
    }

    saveData(type, data) {
        try {
            localStorage.setItem(CONFIG.LOCAL_STORAGE[type.toUpperCase() + '_KEY'], JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                alert('Storage limit exceeded. Please export old data to free up space.');
            }
            
            return false;
        }
    }

    addMeasurement(measurementData) {
        const measurement = {
            id: Utils.generateId(),
            timestamp: new Date().toISOString(),
            ...measurementData,
            status: 'pending'
        };
        
        this.measurements.push(measurement);
        const success = this.saveData('measurements', this.measurements);
        
        if (success) {
            this.exportToFile('measurements', measurement);
        }
        
        return { success, data: measurement };
    }

    addAppointment(appointmentData) {
        const appointment = {
            id: Utils.generateId(),
            timestamp: new Date().toISOString(),
            ...appointmentData,
            status: 'pending',
            reminderSent: false
        };
        
        this.appointments.push(appointment);
        const success = this.saveData('appointments', this.appointments);
        
        if (success) {
            this.exportToFile('appointments', appointment);
        }
        
        return { success, data: appointment };
    }

    exportToFile(type, newData) {
        try {
            const allData = type === 'measurements' ? this.measurements : this.appointments;
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `bandra_${type}_${new Date().toISOString().split('T')[0]}.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
            return true;
        } catch (error) {
            console.error('Error exporting file:', error);
            return false;
        }
    }

    exportToCSV(type) {
        try {
            const data = type === 'measurements' ? this.measurements : this.appointments;
            
            if (data.length === 0) {
                alert(`No ${type} data to export`);
                return false;
            }

            const headers = Object.keys(data[0]);
            const csvHeaders = headers.join(',');
            
            const csvRows = data.map(item => 
                headers.map(header => {
                    const value = item[header] || '';
                    return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            );

            const csvContent = [csvHeaders, ...csvRows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `bandra_${type}_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            return false;
        }
    }

    getStats() {
        return {
            totalMeasurements: this.measurements.length,
            totalAppointments: this.appointments.length,
            recentMeasurements: this.measurements.slice(-5),
            recentAppointments: this.appointments.slice(-5),
            lastSubmission: this.getLastSubmission()
        };
    }

    getLastSubmission() {
        const allSubmissions = [...this.measurements, ...this.appointments];
        if (allSubmissions.length === 0) return null;
        
        return allSubmissions.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        )[0];
    }

    searchData(query, type = 'all') {
        const searchLower = query.toLowerCase();
        const results = {
            measurements: [],
            appointments: []
        };

        if (type === 'measurements' || type === 'all') {
            results.measurements = this.measurements.filter(item => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchLower)
                )
            );
        }

        if (type === 'appointments' || type === 'all') {
            results.appointments = this.appointments.filter(item => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(searchLower)
                )
            );
        }

        return results;
    }

    cleanup() {
        // Remove old auto-save data
        const keys = Object.keys(localStorage);
        const autoSaveKeys = keys.filter(key => 
            key.startsWith(CONFIG.LOCAL_STORAGE.AUTO_SAVE_PREFIX)
        );
        
        autoSaveKeys.forEach(key => {
            const timestamp = localStorage.getItem(key + '_timestamp');
            if (timestamp) {
                const age = Date.now() - parseInt(timestamp);
                if (age > 24 * 60 * 60 * 1000) { // 24 hours
                    localStorage.removeItem(key);
                    localStorage.removeItem(key + '_timestamp');
                }
            }
        });
    }
}

// ===== FORM VALIDATION =====
class FormValidator {
    constructor(form) {
        this.form = form;
        this.fields = form.querySelectorAll('input[required], select[required], textarea[required]');
        this.errors = new Map();
        this.init();
    }

    init() {
        this.fields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', Utils.debounce(() => this.validateField(field), 300));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const name = field.name;
        let isValid = true;
        let errorMessage = '';

        // Remove existing status classes
        field.classList.remove('valid', 'invalid');
        this.removeFieldError(field);

        // Required field validation
        if (!value && field.hasAttribute('required')) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(name)} is required`;
        } else if (value) {
            // Specific field validations
            switch (name) {
                case 'Name':
                    if (!Utils.validateName(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid name (2-50 characters, letters only)';
                    }
                    break;
                case 'Email':
                    if (!Utils.validateEmail(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'Contact Number':
                    if (!Utils.validatePhone(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number';
                    }
                    break;
                case 'Preferred Date':
                    if (!Utils.validateDate(value)) {
                        isValid = false;
                        errorMessage = 'Please select a future date';
                    }
                    break;
                case 'Service Type':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Please select a service type';
                    }
                    break;
                case 'Bust':
                case 'Waist':
                case 'Shoulder Width':
                case 'Sleeve Length':
                    if (isNaN(value) || value <= 0) {
                        isValid = false;
                        errorMessage = 'Please enter a valid measurement';
                    }
                    break;
            }
        }

        // Apply visual feedback
        if (isValid && value) {
            field.classList.add('valid');
        } else if (!isValid) {
            field.classList.add('invalid');
            this.showFieldError(field, errorMessage);
        }

        this.errors.set(name, { isValid, errorMessage });
        return isValid;
    }

    showFieldError(field, message) {
        this.removeFieldError(field);
        
        const errorDiv = Utils.createElement('div', 'field-error-message', message);
        field.parentNode.appendChild(errorDiv);
    }

    removeFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    getFieldLabel(name) {
        const labels = {
            'Name': 'Name',
            'Email': 'Email address',
            'Contact Number': 'Phone number',
            'Preferred Date': 'Preferred date',
            'Service Type': 'Service type'
        };
        return labels[name] || name;
    }

    validateAll() {
        let allValid = true;
        this.fields.forEach(field => {
            if (!this.validateField(field)) {
                allValid = false;
            }
        });
        return allValid;
    }

    getErrors() {
        return Array.from(this.errors.entries()).filter(([, error]) => !error.isValid);
    }
}

// ===== FORM SUBMISSION =====
class FormSubmission {
    constructor(formId, formType) {
        this.form = document.getElementById(formId);
        this.formType = formType;
        this.storage = new LocalStorageManager();
        this.statusDiv = this.form.querySelector('.form-status');
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        this.validator = new FormValidator(this.form);
        this.autoSave = new AutoSave(this.form, formType);
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.autoSave.loadSavedData();
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validator.validateAll()) {
            const errors = this.validator.getErrors();
            if (errors.length > 0) {
                const firstError = errors[0];
                const field = this.form.querySelector(`[name="${firstError[0]}"]`);
                field.focus();
                Utils.showError(this.statusDiv, 'Please fix the errors above');
            }
            return;
        }

        this.setLoadingState(true);
        Utils.clearMessage(this.statusDiv);

        try {
            const formData = this.collectFormData();
            const result = this.formType === 'measurement' 
                ? this.storage.addMeasurement(formData)
                : this.storage.addAppointment(formData);

            if (result.success) {
                this.handleSuccess(result.data);
                this.autoSave.clearSavedData();
            } else {
                throw new Error('Failed to save data');
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (key !== 'formType') {
                data[key] = Utils.sanitizeInput(value);
            }
        }
        
        return data;
    }

    handleSuccess(data) {
        const message = this.formType === 'measurement' 
            ? 'Measurements submitted successfully! Data saved to your computer.'
            : 'Appointment booked successfully! Data saved to your computer.';
        
        Utils.showSuccess(this.statusDiv, message);
        this.form.reset();
        this.validator.errors.clear();
        
        // Clear validation states
        this.form.querySelectorAll('.valid, .invalid').forEach(field => {
            field.classList.remove('valid', 'invalid');
        });
        
        this.form.querySelectorAll('.field-error-message').forEach(error => {
            error.remove();
        });

        // Show data management options
        this.showDataManagementOptions();

        setTimeout(() => {
            Utils.clearMessage(this.statusDiv);
        }, 5000);
    }

    handleError(error) {
        console.error('Form submission error:', error);
        
        let errorMessage = 'Something went wrong. Please try again.';
        
        if (error.message.includes('QuotaExceededError')) {
            errorMessage = 'Storage limit exceeded. Please export old data.';
        } else if (error.message.includes('SecurityError')) {
            errorMessage = 'Browser storage unavailable. Please enable local storage.';
        }
        
        Utils.showError(this.statusDiv, errorMessage);

        setTimeout(() => {
            Utils.clearMessage(this.statusDiv);
        }, 8000);
    }

    showDataManagementOptions() {
        const optionsDiv = Utils.createElement('div', 'data-management-options', `
            <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0 0 0.5rem 0; font-weight: 500;">Data saved successfully!</p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="window.exportData('${this.formType}', 'json')" class="btn btn-sm btn-secondary">
                        <i class="fas fa-download"></i> Export JSON
                    </button>
                    <button onclick="window.exportData('${this.formType}', 'csv')" class="btn btn-sm btn-secondary">
                        <i class="fas fa-file-csv"></i> Export CSV
                    </button>
                    <button onclick="window.viewData('${this.formType}')" class="btn btn-sm btn-secondary">
                        <i class="fas fa-eye"></i> View Data
                    </button>
                </div>
            </div>
        `);
        
        this.statusDiv.appendChild(optionsDiv);
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            this.submitBtn.disabled = true;
            this.submitBtn.style.opacity = '0.7';
        } else {
            this.submitBtn.innerHTML = this.formType === 'measurement' ? 'Submit Measurements' : 'Book Appointment';
            this.submitBtn.disabled = false;
            this.submitBtn.style.opacity = '1';
        }
    }
}

// ===== AUTO SAVE =====
class AutoSave {
    constructor(form, formType) {
        this.form = form;
        this.formType = formType;
        this.saveKey = CONFIG.LOCAL_STORAGE.AUTO_SAVE_PREFIX + formType;
        this.init();
    }

    init() {
        const fields = this.form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.addEventListener('input', Utils.debounce(() => this.save(), 2000));
        });
    }

    save() {
        try {
            const formData = this.collectFormData();
            localStorage.setItem(this.saveKey, JSON.stringify(formData));
            localStorage.setItem(this.saveKey + '_timestamp', Date.now().toString());
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    loadSavedData() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Populate form fields
                Object.entries(data).forEach(([key, value]) => {
                    const field = this.form.querySelector(`[name="${key}"]`);
                    if (field && !field.value) {
                        field.value = value;
                    }
                });
                
                // Clear auto-save after successful load
                this.clearSavedData();
            }
        } catch (error) {
            console.error('Load auto-save failed:', error);
        }
    }

    clearSavedData() {
        localStorage.removeItem(this.saveKey);
        localStorage.removeItem(this.saveKey + '_timestamp');
    }

    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (key !== 'formType') {
                data[key] = value;
            }
        }
        
        return data;
    }
}

// ===== PORTFOLIO FILTER =====
class PortfolioFilter {
    constructor() {
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.portfolioItems = document.querySelectorAll('.portfolio-item');
        this.activeFilter = 'all';
        this.init();
    }

    init() {
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterItems(e.target.dataset.filter));
        });
    }

    filterItems(filterValue) {
        // Update active button
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        this.activeFilter = filterValue;

        this.portfolioItems.forEach(item => {
            const category = item.dataset.category;
            const shouldShow = filterValue === 'all' || category === filterValue;
            
            if (shouldShow) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                }, 50);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }
}

// ===== NAVIGATION =====
class Navigation {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.navMenu = document.querySelector('.nav-menu');
        this.hamburger = document.querySelector('.hamburger');
        this.init();
    }

    init() {
        this.hamburger.addEventListener('click', () => this.toggleMenu());
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });

        window.addEventListener('scroll', Utils.throttle(() => this.handleScroll(), 100));
    }

    toggleMenu() {
        this.hamburger.classList.toggle('active');
        this.navMenu.classList.toggle('active');
        
        // Animate hamburger
        const bars = this.hamburger.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            if (this.hamburger.classList.contains('active')) {
                if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) bar.style.opacity = '0';
                if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                bar.style.transform = '';
                bar.style.opacity = '';
            }
        });
    }

    closeMenu() {
        this.hamburger.classList.remove('active');
        this.navMenu.classList.remove('active');
    }

    handleScroll() {
        if (window.scrollY > 100) {
            this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            this.navbar.style.backdropFilter = 'blur(10px)';
            this.navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
        } else {
            this.navbar.style.background = 'var(--white)';
            this.navbar.style.backdropFilter = 'none';
            this.navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }
    }
}

// ===== WHATSAPP INTEGRATION =====
class WhatsAppIntegration {
    constructor() {
        this.phoneNumber = CONFIG.WHATSAPP.NUMBER;
        this.message = CONFIG.WHATSAPP.MESSAGE;
        this.init();
    }

    init() {
        this.createButton();
        this.addStyles();
    }

    createButton() {
        const button = Utils.createElement('div', 'whatsapp-float', '<i class="fab fa-whatsapp"></i>');
        button.title = 'Chat with us on WhatsApp';
        button.addEventListener('click', () => this.openChat());
        document.body.appendChild(button);
    }

    openChat() {
        const message = encodeURIComponent(this.message);
        const url = `https://wa.me/${this.phoneNumber}?text=${message}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    addStyles() {
        const styles = `
            .whatsapp-float {
                position: fixed;
                width: 60px;
                height: 60px;
                bottom: 30px;
                right: 30px;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                border-radius: 50%;
                text-align: center;
                font-size: 28px;
                box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
                z-index: 1000;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                animation: pulse 2s infinite;
            }
            
            .whatsapp-float:hover {
                transform: scale(1.1) translateY(-5px);
                box-shadow: 0 8px 30px rgba(37, 211, 102, 0.6);
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
                100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// ===== ANIMATIONS =====
class Animations {
    constructor() {
        this.init();
    }

    init() {
        this.animateHero();
        this.animatePortfolio();
        this.animateServices();
    }

    animateHero() {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.opacity = '0';
            heroContent.style.transform = 'translateY(50px)';
            
            setTimeout(() => {
                heroContent.style.transition = 'all 1s ease';
                heroContent.style.opacity = '1';
                heroContent.style.transform = 'translateY(0)';
            }, 300);
        }
    }

    animatePortfolio() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.portfolio-item').forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(item);
        });
    }

    animateServices() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.service-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }
}

// ===== DATA MANAGEMENT INTERFACE =====
class DataManagementInterface {
    constructor() {
        this.storage = new LocalStorageManager();
        this.createInterface();
    }

    createInterface() {
        this.createButton();
        this.addStyles();
    }

    createButton() {
        const button = Utils.createElement('button', 'data-management-btn', 
            '<i class="fas fa-database"></i> Data Management'
        );
        button.onclick = () => this.showManagementPanel();
        document.body.appendChild(button);
    }

    addStyles() {
        const styles = `
            .data-management-btn {
                position: fixed;
                bottom: 100px;
                right: 30px;
                background: linear-gradient(135deg, #6c757d, #495057);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 999;
                transition: all 0.3s ease;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .data-management-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }
            
            .data-management-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 90%;
                max-height: 90%;
                overflow-y: auto;
                display: none;
            }
            
            .data-management-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: none;
            }
            
            .data-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .stat-card {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                border: 1px solid #dee2e6;
            }
            
            .stat-number {
                font-size: 2rem;
                font-weight: bold;
                color: #d4af37;
                display: block;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    showManagementPanel() {
        const stats = this.storage.getStats();
        
        const panel = Utils.createElement('div', 'data-management-panel');
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Data Management</h3>
                <button onclick="this.closest('.data-management-panel').remove(); document.querySelector('.data-management-overlay').remove();" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
            </div>
            
            <div class="data-stats">
                <div class="stat-card">
                    <div class="stat-number">${stats.totalMeasurements}</div>
                    <div>Measurements</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.totalAppointments}</div>
                    <div>Appointments</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <button onclick="window.exportData('measurements', 'json')" class="btn btn-sm btn-secondary">
                    <i class="fas fa-download"></i> Export Measurements (JSON)
                </button>
                <button onclick="window.exportData('appointments', 'json')" class="btn btn-sm btn-secondary">
                    <i class="fas fa-download"></i> Export Appointments (JSON)
                </button>
                <button onclick="window.exportData('measurements', 'csv')" class="btn btn-sm btn-secondary">
                    <i class="fas fa-file-csv"></i> Export Measurements (CSV)
                </button>
                <button onclick="window.exportData('appointments', 'csv')" class="btn btn-sm btn-secondary">
                    <i class="fas fa-file-csv"></i> Export Appointments (CSV)
                </button>
                <button onclick="window.viewAllData()" class="btn btn-sm btn-secondary">
                    <i class="fas fa-eye"></i> View All Data
                </button>
                <button onclick="window.createBackup()" class="btn btn-sm btn-secondary">
                    <i class="fas fa-save"></i> Create Backup
                </button>
            </div>
            
            <div>
                <h4>Recent Submissions</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${this.renderRecentData(stats)}
                </div>
            </div>
        `;
        
        const overlay = Utils.createElement('div', 'data-management-overlay');
        overlay.onclick = () => {
            panel.remove();
            overlay.remove();
        };
        
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        
        overlay.style.display = 'block';
        panel.style.display = 'block';
    }

    renderRecentData(stats) {
        let html = '<div style="margin-bottom: 1rem;"><strong>Recent Measurements:</strong></div>';
        
        stats.recentMeasurements.forEach(item => {
            html += `
                <div style="padding: 0.5rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 4px;">
                    <strong>${item.Name}</strong> - ${new Date(item.timestamp).toLocaleDateString()}
                    <br><small>Bust: ${item.Bust}", Waist: ${item.Waist}"</small>
                </div>
            `;
        });
        
        html += '<div style="margin: 1rem 0;"><strong>Recent Appointments:</strong></div>';
        
        stats.recentAppointments.forEach(item => {
            html += `
                <div style="padding: 0.5rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 4px;">
                    <strong>${item.Name}</strong> - ${new Date(item.timestamp).toLocaleDateString()}
                    <br><small>${item['Service Type']} on ${new Date(item['Preferred Date']).toLocaleDateString()}</small>
                </div>
            `;
        });
        
        return html;
    }
}

// ===== GLOBAL FUNCTIONS =====
window.exportData = function(type, format) {
    const storage = new LocalStorageManager();
    
    if (format === 'json') {
        storage.exportToFile(type, {});
    } else if (format === 'csv') {
        storage.exportToCSV(type);
    }
};

window.viewAllData = function(type = 'all') {
    const storage = new LocalStorageManager();
    const data = type === 'all' 
        ? { measurements: storage.measurements, appointments: storage.appointments }
        : storage.loadData(type);
    
    const dataWindow = window.open('', '_blank', 'width=800,height=600');
    dataWindow.document.write(`
        <html>
        <head>
            <title>Bandra Tailores - Data View</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
                h1 { color: #d4af37; margin-bottom: 20px; }
                .stats { background: #e8f5e8; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
                button { background: #d4af37; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
                button:hover { background: #b8941f; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Bandra Tailores - Data View</h1>
                <div class="stats">
                    <strong>Statistics:</strong><br>
                    Total Measurements: ${storage.measurements.length}<br>
                    Total Appointments: ${storage.appointments.length}
                </div>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <div style="margin-top: 20px;">
                    <button onclick="window.print()">Print</button>
                    <button onclick="window.close()">Close</button>
                </div>
            </div>
        </body>
        </html>
    `);
};

window.createBackup = function() {
    const storage = new LocalStorageManager();
    const backupData = {
        measurements: storage.measurements,
        appointments: storage.appointments,
        backupDate: new Date().toISOString(),
        version: '2.0'
    };
    
    const backupStr = JSON.stringify(backupData, null, 2);
    const backupBlob = new Blob([backupStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(backupBlob);
    link.download = `bandra_complete_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    alert('Complete backup created successfully!');
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Bandra Tailores Website...');
    
    // Initialize components
    new Navigation();
    new PortfolioFilter();
    new WhatsAppIntegration();
    new DataManagementInterface();
    
    // Initialize forms
    new FormSubmission('measurementForm', 'measurement');
    new FormSubmission('appointmentForm', 'appointment');
    
    // Global smooth scrolling function
    window.scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }
    };
    
    // Add loading animation to page
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    console.log('✅ Bandra Tailores website initialized successfully!');
    console.log('📊 Data will be saved to your computer automatically');
    console.log('💾 Use the Data Management button to export/view your data');
});