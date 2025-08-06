document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const calculateBtn = document.getElementById('calculateBtn');
    const addFiberBtn = document.getElementById('addFiberBtn');
    const sectionsContainer = document.getElementById('fiber-sections-container');
    const resultsSection = document.getElementById('results');
    const resultsListEl = document.getElementById('results-list');
    const bTotalResultEl = document.getElementById('btotal_result');
    const n2Input = document.getElementById('n2_value');
    const infoHeader = document.getElementById('info-header');
    const infoContentWrapper = document.getElementById('info-content-wrapper');

    let sectionCounter = 1;

    // --- Event Listeners ---
    addFiberBtn.addEventListener('click', addFiberSection);
    calculateBtn.addEventListener('click', calculateAndDisplay);
    
    // Listener for the collapsible info section
    infoHeader.addEventListener('click', () => {
        const icon = infoHeader.querySelector('.toggle-icon');
        icon.classList.toggle('expanded');
        if (infoContentWrapper.style.maxHeight) {
            infoContentWrapper.style.maxHeight = null;
        } else {
            infoContentWrapper.style.maxHeight = infoContentWrapper.scrollHeight + "px";
        }
    });

    // Use event delegation for dynamic elements
    sectionsContainer.addEventListener('click', handleSectionClick);
    sectionsContainer.addEventListener('input', handleSectionInput);

    // ... (The rest of the script remains exactly the same)


    function addFiberSection() {
        sectionCounter++;
        const lastSection = sectionsContainer.querySelector('.fiber-section:last-of-type');
        const newSection = lastSection.cloneNode(true);
        
        newSection.dataset.sectionId = sectionCounter;
        newSection.querySelector('h3').textContent = `Fiber #${sectionCounter}`;

        // Update all IDs and 'for' attributes to be unique
        newSection.querySelectorAll('[id]').forEach(el => {
            el.id = el.id.replace(/_\d+$/, `_${sectionCounter}`);
        });
        newSection.querySelectorAll('label[for]').forEach(el => {
            el.setAttribute('for', el.getAttribute('for').replace(/_\d+$/, `_${sectionCounter}`));
        });

        // Add a remove button if one doesn't exist on the cloned section
        if (!newSection.querySelector('.remove-btn')) {
             const removeBtn = document.createElement('button');
             removeBtn.textContent = 'Remove';
             removeBtn.className = 'remove-btn';
             newSection.querySelector('.section-header').appendChild(removeBtn);
        }

        const lastAvgPowerOut = parseFloat(lastSection.querySelector('.avgPowerOut').value);
        const newAvgPowerInEl = newSection.querySelector('.avgPowerIn');
        const newGainEl = newSection.querySelector('.gain');
        const newAvgPowerOutEl = newSection.querySelector('.avgPowerOut');

        if (!isNaN(lastAvgPowerOut)) {
            newAvgPowerInEl.value = lastAvgPowerOut.toFixed(4);
        }
        
        newGainEl.value = "1.0";
        
        const newAvgPowerIn = parseFloat(newAvgPowerInEl.value);
        const newGain = parseFloat(newGainEl.value);
        if(!isNaN(newAvgPowerIn) && !isNaN(newGain)) {
            newAvgPowerOutEl.value = (newAvgPowerIn * newGain).toFixed(4);
        }

        sectionsContainer.appendChild(newSection);
    }

    function handleSectionClick(e) {
        if (e.target.classList.contains('remove-btn')) {
            e.target.closest('.fiber-section').remove();
        }
    }
    
    function handleSectionInput(e) {
        const section = e.target.closest('.fiber-section');
        if (!section) return;

        if (e.target.classList.contains('avgPowerIn') || e.target.classList.contains('gain') || e.target.classList.contains('avgPowerOut')) {
             updateLinkedPowerInputs(e.target, section);
        }
    }
    
    function updateLinkedPowerInputs(target, section) {
        const avgPowerInEl = section.querySelector('.avgPowerIn');
        const gainEl = section.querySelector('.gain');
        const avgPowerOutEl = section.querySelector('.avgPowerOut');

        const P_in = parseFloat(avgPowerInEl.value);
        const gain = parseFloat(gainEl.value);
        const P_out = parseFloat(avgPowerOutEl.value);
        
        const isTargetPOut = target === avgPowerOutEl;
        avgPowerOutEl.readOnly = !isTargetPOut;

        if (!isTargetPOut) { 
             if (!isNaN(P_in) && !isNaN(gain)) {
                avgPowerOutEl.value = (P_in * gain).toFixed(4);
            }
        } else {
            if (!isNaN(P_in) && !isNaN(P_out) && P_in > 0) {
                gainEl.value = (P_out / P_in).toFixed(4);
            } else if (P_in === 0 && P_out > 0) {
                gainEl.value = 'Infinity';
            }
        }
    }


    function calculateAndDisplay() {
        const n2 = parseFloat(n2Input.value);
        if (isNaN(n2)) {
            alert("Please enter a valid value for the Nonlinear Index n₂.");
            return;
        }

        let bTotal = 0;
        resultsListEl.innerHTML = '';
        
        const sections = sectionsContainer.querySelectorAll('.fiber-section');

        for (const [index, section] of sections.entries()) {
            const sectionId = index + 1;
            
            const P_avg_in = parseFloat(section.querySelector('.avgPowerIn').value);
            const lambda_nm = parseFloat(section.querySelector('.wavelength').value);
            const T_pulse_ps = parseFloat(section.querySelector('.pulseDuration').value);
            const f_rep_MHz = parseFloat(section.querySelector('.prr').value);
            const gain = parseFloat(section.querySelector('.gain').value);
            const L = parseFloat(section.querySelector('.length').value);
            const MFD_um = parseFloat(section.querySelector('.mfd').value);

            const inputs = [P_avg_in, lambda_nm, T_pulse_ps, f_rep_MHz, gain, L, MFD_um];
            if (inputs.some(isNaN) || inputs.some(v => v < 0)) {
                alert(`Please ensure all inputs for Fiber #${sectionId} are valid, non-negative numbers.`);
                resultsSection.classList.add('hidden');
                return;
            }
            if (gain < 0) {
                 alert(`Numerical gain for Fiber #${sectionId} must be non-negative.`);
                 resultsSection.classList.add('hidden');
                 return;
            }

            const lambda_m = lambda_nm * 1e-9;
            const T_pulse_s = T_pulse_ps * 1e-12;
            const f_rep_Hz = f_rep_MHz * 1e6;
            const MFD_m = MFD_um * 1e-6;
            
            const dutyCycle = T_pulse_s * f_rep_Hz;
            if (dutyCycle <= 0) {
                alert(`Pulse duration and PRR for Fiber #${sectionId} must be greater than zero.`);
                resultsSection.classList.add('hidden');
                return;
            }
            
            const P_peak_in = P_avg_in / dutyCycle;
            const A_eff = (Math.PI / 4) * Math.pow(MFD_m, 2);

            let L_eff;
            if (Math.abs(gain - 1.0) < 1e-9) {
                L_eff = L;
            } else {
                L_eff = L * (gain - 1) / Math.log(gain);
            }
            
            const b_section = (2 * Math.PI / lambda_m) * n2 * (P_peak_in / A_eff) * L_eff;
            bTotal += b_section;

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <span>B-Integral (Fiber #${sectionId}):</span>
                <strong>${b_section.toFixed(3)} rad</strong>
            `;
            resultsListEl.appendChild(resultItem);
        }

        bTotalResultEl.textContent = `${bTotal.toFixed(3)} rad`;
        resultsSection.classList.remove('hidden');
    }
});