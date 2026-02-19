document.addEventListener('DOMContentLoaded', () => {
    const contactList = document.getElementById('contact-list');
    const template = document.getElementById('contact-point-template');
    const initialMessageTemplate = document.getElementById('initial-message-template');
    const sachsenMapObject = document.getElementById('sachsen-map');
    const filterBar = document.getElementById('filter-bar');

    let allData = {};
    let activeCountyPath = null;
    let loadMoreButton = null;

    const itemsPerLoad = 5;

    /**
     * Highlights the selected county on the SVG map.
     * @param {string} countyId - The ID of the county to highlight, or 'all' to clear selection.
     */
    const updateActiveMapCounty = (countyId) => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc) return;

        if (activeCountyPath) {
            activeCountyPath.classList.remove('active');
            activeCountyPath = null;
        }

        if (countyId !== 'all') {
            const countyPath = svgDoc.getElementById(countyId);
            if (countyPath) {
                countyPath.classList.add('active');
                activeCountyPath = countyPath;
            }
        }
    };

    /**
     * Toggles the 'active' class on the filter buttons.
     * @param {string} countyId - The ID of the currently selected county.
     */
    const updateActiveFilterButton = (countyId) => {
        const buttons = filterBar.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.county === countyId);
        });
    };

    const updateHeadlineVisibility = () => {
        const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
        allCountyHeadlines.forEach(headline => {
            const county = headline.dataset.county;
            const pointsForCounty = document.querySelectorAll(`.contact-point[data-county="${county}"]`);
            const isAnyPointVisible = Array.from(pointsForCounty).some(point => !point.classList.contains('hidden'));

            headline.classList.toggle('hidden', !isAnyPointVisible);
        });
    };

    const handleLoadMore = () => {
        const activeButton = filterBar.querySelector('button.active');
        if (!activeButton) return;
        const activeCountyId = activeButton.dataset.county;

        const hiddenPoints = document.querySelectorAll(`.contact-point.hidden[data-county="${activeCountyId}"]`);

        for (let i = 0; i < itemsPerLoad && i < hiddenPoints.length; i++) {
            hiddenPoints[i].classList.remove('hidden');
        }

        updateHeadlineVisibility();

        if (hiddenPoints.length <= itemsPerLoad) {
            loadMoreButton.style.display = 'none';
        }
    };

    /**
     * Filters the contact points list based on the selected county.
     * It also triggers updates for the map and filter buttons.
     * @param {string} countyId - The ID of the county to filter by, or 'all' to show all.
     */
    const filterContactPoints = (countyId) => {
        const allCountyHeadlines = document.querySelectorAll('#contact-points h3');
        const allContactPoints = document.querySelectorAll('.contact-point');
        const initialMessage = document.querySelector('.initial-message');

        if (!loadMoreButton) {
            loadMoreButton = document.createElement('button');
            loadMoreButton.textContent = 'Mehr laden';
            loadMoreButton.id = 'load-more';
            loadMoreButton.addEventListener('click', handleLoadMore);
            contactList.appendChild(loadMoreButton);
        }
        loadMoreButton.style.display = 'none';
        if (initialMessage) initialMessage.style.display = 'none';

        if (countyId === 'all') {
            if (initialMessage) initialMessage.style.display = 'block';
            allCountyHeadlines.forEach(headline => headline.classList.add('hidden'));
            allContactPoints.forEach(point => point.classList.add('hidden'));
        } else {
            allCountyHeadlines.forEach(headline => {
                headline.classList.toggle('hidden', headline.dataset.county !== countyId);
            });

            const countyPoints = Array.from(allContactPoints).filter(p => p.dataset.county === countyId);

            allContactPoints.forEach(point => point.classList.add('hidden'));

            countyPoints.forEach((point, index) => {
                if (index < itemsPerLoad) {
                    point.classList.remove('hidden');
                }
            });

            if (countyPoints.length > itemsPerLoad) {
                loadMoreButton.style.display = 'block';
            }
        }

        updateHeadlineVisibility();
        updateActiveFilterButton(countyId);
        updateActiveMapCounty(countyId);
    };

    /**
     * Creates and appends the filter buttons to the filter bar.
     * One button for each county and a button to show all.
     */
    const createFilterBar = () => {
        for (const countyKey in allData) {
            const county = allData[countyKey];
            const button = document.createElement('button');
            button.textContent = county.fullName;
            button.dataset.county = countyKey;
            button.addEventListener('click', () => filterContactPoints(countyKey));
            filterBar.appendChild(button);
        }
    };

    const fallbackCopyTextToClipboard = (text, onSuccess) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                onSuccess();
            } else {
                console.error('Fallback: Oops, unable to copy');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }

    const getOpeningStatus = (structuredHours) => {
        if (!structuredHours) {
            return {status: 'unknown'};
        }

        const dayOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayNames = {
            mon: 'Montag',
            tue: 'Dienstag',
            wed: 'Mittwoch',
            thu: 'Donnerstag',
            fri: 'Freitag',
            sat: 'Samstag',
            sun: 'Sonntag'
        };

        let allIntervals = [];
        let hasAppointment = false;

        dayOrder.forEach((day, dayIndex) => {
            if (structuredHours[day]) {
                structuredHours[day].forEach(entry => {
                    if (entry === 'appointment') {
                        hasAppointment = true;
                    } else {
                        const times = entry.match(/(\d{2}):(\d{2})–(\d{2}):(\d{2})/);
                        if (times) {
                            const startMinutes = parseInt(times[1], 10) * 60 + parseInt(times[2], 10);
                            const endMinutes = parseInt(times[3], 10) * 60 + parseInt(times[4], 10);
                            allIntervals.push({
                                day: day,
                                dayIndex: dayIndex,
                                start: startMinutes,
                                end: endMinutes
                            });
                        }
                    }
                });
            }
        });

        if (allIntervals.length === 0) {
            return hasAppointment ? {status: 'appointment'} : {status: 'unknown'};
        }

        allIntervals.sort((a, b) => {
            if (a.dayIndex !== b.dayIndex) {
                return a.dayIndex - b.dayIndex;
            }
            return a.start - b.start;
        });

        const now = new Date();
        const currentDayIndex = now.getDay();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        for (const interval of allIntervals) {
            if (interval.dayIndex === currentDayIndex) {
                if (currentTimeInMinutes >= interval.start && currentTimeInMinutes < interval.end) {
                    const closesAt = `${String(Math.floor(interval.end / 60)).padStart(2, '0')}:${String(interval.end % 60).padStart(2, '0')}`;
                    return {status: 'open', closesAt: closesAt};
                }
            }
        }

        for (const interval of allIntervals) {
            if (interval.dayIndex > currentDayIndex || (interval.dayIndex === currentDayIndex && interval.start > currentTimeInMinutes)) {
                const opensAt = `${String(Math.floor(interval.start / 60)).padStart(2, '0')}:${String(interval.start % 60).padStart(2, '0')}`;
                return {status: 'closed', opensAt: opensAt, opensOn: dayNames[interval.day]};
            }
        }

        if (allIntervals.length > 0) {
            const nextInterval = allIntervals[0];
            const opensAt = `${String(Math.floor(nextInterval.start / 60)).padStart(2, '0')}:${String(nextInterval.start % 60).padStart(2, '0')}`;
            return {status: 'closed', opensAt: opensAt, opensOn: dayNames[nextInterval.day]};
        }

        return hasAppointment ? {status: 'appointment'} : {status: 'unknown'};
    };

    /**
     * Renders the entire list of contact points from the fetched data.
     * It groups contact points by county.
     */
    const renderContactPoints = () => {
        contactList.innerHTML = '';

        if (initialMessageTemplate) {
            const initialMessageClone = initialMessageTemplate.content.cloneNode(true);
            contactList.appendChild(initialMessageClone);
        }

        for (const countyKey in allData) {
            const county = allData[countyKey];
            if (county.contactPoints && county.contactPoints.length > 0) {
                const countyName = document.createElement('h3');
                countyName.textContent = county.fullName;
                countyName.dataset.county = countyKey;
                contactList.appendChild(countyName);

                county.contactPoints.forEach(point => {
                    const clone = template.content.cloneNode(true);
                    const pointDiv = clone.querySelector('.contact-point');
                    pointDiv.dataset.county = countyKey;

                    const setText = (selector, text) => {
                        const element = clone.querySelector(selector);
                        if (element) element.textContent = text;
                    };

                    const setLink = (selector, href, protocol = '') => {
                        const link = clone.querySelector(selector);
                        if (link) {
                            const wrapper = link.parentElement;
                            if (href) {
                                // Normalize website links: if selector is .web or .website and value lacks protocol, prepend https://
                                let normalized = href;
                                if ((selector === '.web' || selector === '.website') && !/^https?:\/\//i.test(String(href).trim())) {
                                    normalized = 'https://' + String(href).replace(/^\/*/, '');
                                }

                                link.href = protocol ? `${protocol}${href}` : normalized;

                                if (selector === '.web' || selector === '.website') {
                                    // show cleaned domain/path as text
                                    const shortenUrl = (url, maxLength = 40) => {
                                        let cleanUrl = url.replace(/^(https?:\/\/)/, '').replace(/^www\./, '');
                                        if (cleanUrl.length <= maxLength) {
                                            return cleanUrl;
                                        }
                                        try {
                                            const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
                                            const domain = urlObject.hostname.replace(/^www\./, '');
                                            const path = urlObject.pathname;
                                            const availableLength = maxLength - domain.length - 1; // -1 for '/'
                                            if (availableLength > 5) { // 5 for '...' and 2 chars
                                                const half = Math.floor((availableLength - 3) / 2);
                                                const shortPath = `${path.substring(1, half + 1)}...${path.substring(path.length - half)}`;
                                                return `${domain}/${shortPath}`;
                                            }
                                        } catch (e) {
                                            // fallback for invalid URLs
                                        }
                                        const half = Math.floor((maxLength - 3) / 2);
                                        return `${cleanUrl.substring(0, half)}...${cleanUrl.substring(cleanUrl.length - half)}`;
                                    };
                                    link.textContent = shortenUrl(normalized);
                                } else {
                                    link.textContent = href;
                                }

                                // ensure wrapper is visible
                                if (wrapper) wrapper.style.display = '';

                                // set common attributes
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                            } else {
                                // hide the whole wrapper (icon + link) when no href provided
                                if (wrapper) wrapper.style.display = 'none';
                            }
                        }
                    };

                    // ID and Name are required.
                    setText('.name', point.name);

                    // Carrier is optional.
                    if (point.carrier) {
                        setText('.carrier', point.carrier);
                    } else {
                        const carrierEl = clone.querySelector('.carrier');
                        if (carrierEl) carrierEl.style.display = 'none';
                    }

                    // Consolidated detail-grid population: address, opening hours, links
                    const populateDetailGrid = (clone, point) => {
                        const detailGrid = clone.querySelector('.detail-grid');
                        if (!detailGrid) return;

                        // Address
                        const addrWrapper = clone.querySelector('.address-wrapper');
                        const addrSpan = clone.querySelector('.address');
                        if (point.address) {
                            const parts = [
                                point.address.street,
                                `${point.address.postalCode || ''} ${point.address.city || ''}`.trim()
                            ].filter(Boolean);
                            if (parts.length > 0) {
                                if (addrSpan) addrSpan.textContent = parts.join(', ');
                                if (addrWrapper) addrWrapper.style.display = '';
                            } else {
                                if (addrWrapper) addrWrapper.style.display = 'none';
                            }
                        } else if (addrWrapper) {
                            addrWrapper.style.display = 'none';
                        }

                        // Opening Hours
                        const openingHoursWrapper = clone.querySelector('.opening-hours-wrapper');
                        if (openingHoursWrapper) {
                            const header = openingHoursWrapper.querySelector('.opening-hours-header');
                            const content = clone.querySelector('.collapsible-content');
                            const chevron = openingHoursWrapper.querySelector('.chevron-icon');
                            const statusEl = openingHoursWrapper.querySelector('.opening-status');
                            const weeklyHoursContainer = clone.querySelector('.weekly-opening-hours');

                            const structuredHours = point.openingHours?.structured;
                            const hasText = point.openingHours?.text;
                            const hasStructured = structuredHours && Object.values(structuredHours).some(day => day.length > 0);

                            if (!hasText && !hasStructured) {
                                openingHoursWrapper.style.display = 'none';
                                if (content) content.style.display = 'none';
                            } else {
                                // Populate Status
                                if (statusEl) {
                                    const statusInfo = getOpeningStatus(point.openingHours?.structured);
                                    statusEl.innerHTML = '';
                                    statusEl.classList.remove('status-open', 'status-closed', 'status-appointment');
                                    if (statusInfo.status === 'open') {
                                        statusEl.classList.add('status-open');
                                        statusEl.innerHTML = `<span class="status-text-bold">Geöffnet</span> · <span class="status-text-extra">Heute geöffnet bis ${statusInfo.closesAt} Uhr</span>`;
                                    } else if (statusInfo.status === 'closed') {
                                        statusEl.classList.add('status-closed');
                                        statusEl.innerHTML = `<span class="status-text-bold">Geschlossen</span> · <span class="status-text-extra">Öffnet am ${statusInfo.opensOn} um ${statusInfo.opensAt} Uhr</span>`;
                                    } else if (statusInfo.status === 'appointment') {
                                        statusEl.classList.add('status-appointment');
                                        statusEl.textContent = 'Nach Vereinbarung';
                                    } else {
                                        statusEl.textContent = 'Öffnungszeiten'; // Fallback text
                                    }
                                }

                                // Populate Collapsible Content with weekly grid
                                if (weeklyHoursContainer) {
                                    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                                    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                                    const todayIndex = new Date().getDay();
                                    let gridHtml = '';

                                    for (let i = 0; i < 7; i++) {
                                        const dayIndex = (todayIndex + i) % 7;
                                        const dayKey = dayKeys[dayIndex];
                                        const dayName = dayNames[dayIndex];
                                        const isToday = i === 0;

                                        let hoursHtml;
                                        let hoursClass = 'closed-text';
                                        if (structuredHours && structuredHours[dayKey] && structuredHours[dayKey].length > 0) {
                                            hoursHtml = structuredHours[dayKey].map(entry => {
                                                if (entry === 'appointment') return '<div>Nach Vereinbarung</div>';
                                                return `<div>${entry}</div>`;
                                            }).join('');
                                            hoursClass = '';
                                        } else {
                                            hoursHtml = 'Geschlossen';
                                        }

                                        gridHtml += `
                                <div class="day-name ${isToday ? 'current-day' : ''}">${dayName}</div>
                                <div class="day-times ${isToday ? 'current-day' : ''} ${hoursClass}">${hoursHtml}</div>
                            `;
                                    }
                                    weeklyHoursContainer.innerHTML = gridHtml;
                                }


                                // Add click listener to header
                                if (header && content && chevron) {
                                    // Only make it collapsible if there is content to show
                                    if (hasText || hasStructured) {
                                        header.addEventListener('click', () => {
                                            content.classList.toggle('expanded');
                                            chevron.classList.toggle('expanded');
                                        });
                                    } else {
                                        chevron.style.display = 'none';
                                        header.style.cursor = 'default';
                                    }
                                }
                            }
                        }

                        // Opening Hours Comment
                        const commentWrapper = clone.querySelector('.opening-hours-comment-wrapper');
                        if (commentWrapper) {
                            const commentEl = commentWrapper.querySelector('.opening-hours-comment');
                            const hasComment = point.openingHours?.comment;

                            if (hasComment && commentEl) {
                                commentEl.textContent = hasComment;
                                commentWrapper.style.display = 'flex';
                            } else {
                                commentWrapper.style.display = 'none';
                            }
                        }

                        // Contact
                        const webValue = (point.contact && (point.contact.web || point.contact.website)) || null;
                        setLink('.website', webValue);
                        setLink('.email', point.contact && point.contact.email, 'mailto:');

                        const phoneWrapper = clone.querySelector('.phone-wrapper');
                        if (phoneWrapper) {
                            const phoneNumbersSpan = phoneWrapper.querySelector('.phone-numbers');
                            const phoneNumbers = [point.contact?.phone, point.contact?.mobile].flat().filter(Boolean);

                            if (phoneNumbers.length > 0 && phoneNumbersSpan) {
                                phoneNumbersSpan.innerHTML = phoneNumbers
                                    .map(num => `<a href="tel:${num}">${num}</a>`)
                                    .join(', ');
                                phoneWrapper.style.display = '';
                            } else {
                                phoneWrapper.style.display = 'none';
                            }
                        }

                        // Download PDF or similar resource
                        const downloadWrapper = clone.querySelector('.download-wrapper');
                        const downloadAnchor = clone.querySelector('.download');
                        const downloadData = point.download || null;

                        if (downloadWrapper && downloadAnchor) {
                            if (downloadData) {
                                let href = null;
                                let label = null;

                                if (typeof downloadData === 'string') {
                                    href = downloadData;
                                } else if (typeof downloadData === 'object') {
                                    href = downloadData.url || null;
                                    label = downloadData.text || downloadData.title || null;
                                }

                                if (href) {
                                    let normalized = String(href).trim();
                                    if (!/^https?:\/\//i.test(normalized)) {
                                        normalized = 'https://' + normalized.replace(/^\/*/, '');
                                    }
                                    downloadAnchor.href = normalized;

                                    if (!label) {
                                        try {
                                            const urlObj = new URL(normalized);
                                            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                                            const lastSegment = pathSegments.pop();
                                            label = lastSegment || urlObj.hostname;
                                        } catch (e) {
                                            label = normalized.replace(/^https?:\/\//, '');
                                        }
                                    }

                                    downloadAnchor.textContent = label || 'Download';
                                    downloadAnchor.target = '_blank';
                                    downloadAnchor.rel = 'noopener noreferrer';
                                    downloadWrapper.style.display = '';
                                } else {
                                    downloadWrapper.style.display = 'none';
                                }
                            } else {
                                downloadWrapper.style.display = 'none';
                            }
                        }

                        // Social
                        const makeSocialHref = (value, platform) => {
                            if (!value) return null;
                            const bases = {
                                instagram: 'https://instagram.com/',
                                facebook: 'https://facebook.com/',
                                linkedin: 'https://www.linkedin.com/'
                            };

                            let v = String(value).trim();

                            // If it already has a protocol, use as-is.
                            if (/^https?:\/\//i.test(v)) return v;

                            // If it starts with 'www.' or contains the platform domain, add https:// so URL parsing works.
                            if (/^(www\.)/i.test(v) || new RegExp(`${platform}\.com`, 'i').test(v)) {
                                // ensure we don't end up duplicating scheme
                                return 'https://' + v.replace(/^\/*/, '');
                            }

                            // If it's a handle like @name, or a plain username, build a platform URL
                            const handle = v.replace(/^@/, '');
                            return (bases[platform] || '') + handle;
                        };

                        // helper to extract username from a platform URL
                        const extractUsername = (href, platform) => {
                            try {
                                const url = new URL(href);
                                const path = url.pathname.replace(/^\/+|\/+$/g, '');
                                if (!path) return null;
                                const parts = path.split('/');
                                // For Instagram posts (p/...), reels, etc. prefer the profile segment if possible
                                const first = parts[0].toLowerCase();
                                if (['p', 'tv', 'reel'].includes(first) && parts[1]) return parts[1];
                                // LinkedIn often uses /in/username or /company/slug — prefer the slug segment
                                if (platform === 'linkedin' && ['in', 'company', 'pub', 'school'].includes(first) && parts[1]) return parts[1];
                                return parts[0];
                            } catch (e) {
                                // fallback regex
                                const m = href.match(new RegExp(`${platform}\.com\/([^\/?#]+)`, 'i'));
                                return m && m[1] ? m[1] : null;
                            }
                        };

                        // helper to wire a social anchor inside a wrapper
                        const wireSocialAnchor = (wrapperSelector, anchorSelector, value, platform) => {
                            const wrapper = clone.querySelector(wrapperSelector);
                            if (!wrapper) return;

                            // Prefer the specific selector, but fall back to any anchor inside the wrapper for robustness
                            let anchor = null;
                            if (anchorSelector) anchor = wrapper.querySelector(anchorSelector);
                            if (!anchor) anchor = wrapper.querySelector('a');
                            if (!anchor) return;

                            if (!value) {
                                wrapper.style.display = 'none';
                                return;
                            }

                            const href = makeSocialHref(value, platform);
                            anchor.href = href;

                            // Determine display text: prefer @handle for instagram/facebook/linkedin, otherwise show cleaned path/domain
                            let displayText = '';
                            if (typeof value === 'string' && value.trim().startsWith('@')) {
                                displayText = value.trim();
                            } else if (platform === 'instagram' || platform === 'facebook' || platform === 'linkedin') {
                                const username = extractUsername(href, platform);
                                if (username) displayText = '@' + decodeURIComponent(username).replace(/\/+$/, '');
                            }

                            if (!displayText) {
                                displayText = href.replace(/^https?:\/\//, '').replace(/^www\./, '');
                            }

                            anchor.textContent = displayText;
                            anchor.target = '_blank';
                            anchor.rel = 'noopener noreferrer';
                        };

                        wireSocialAnchor('.instagram-wrapper', '.instagram', point.social && (point.social.instagram || point.social.instagramHandle), 'instagram');
                        wireSocialAnchor('.facebook-wrapper', '.facebook', point.social && (point.social.facebook || point.social.facebookHandle), 'facebook');
                        wireSocialAnchor('.linkedin-wrapper', '.linkedin', point.social && (point.social.linkedin || point.social.linkedinHandle), 'linkedin');
                    };

                    // Populate the detail grid for this contact point
                    populateDetailGrid(clone, point);

                    // Copy button functionality
                    const copyButton = clone.querySelector('.copy-button');
                    if (copyButton) {
                        copyButton.addEventListener('click', () => {
                            const parts = [];
                            if (point.carrier) parts.push(`Träger: ${point.carrier}`);
                            parts.push(`Name: ${point.name}`);

                            if (point.address) {
                                const addressParts = [
                                    point.address.street,
                                    `${point.address.postalCode || ''} ${point.address.city || ''}`.trim()
                                ].filter(Boolean);
                                if (addressParts.length > 0) {
                                    parts.push(`Adresse: ${addressParts.join(', ')}`);
                                }
                            }

                            if (point.contact) {
                                const phoneNumbers = [point.contact.phone, point.contact.mobile].flat().filter(Boolean);
                                if (phoneNumbers.length > 0) {
                                    parts.push(`Telefon: ${phoneNumbers.join(', ')}`);
                                }
                                if (point.contact.email) parts.push(`E-Mail: ${point.contact.email}`);
                                const webValue = point.contact.web || point.contact.website;
                                if (webValue) parts.push(`Web: ${webValue}`);
                            }

                            if (point.openingHours) {
                                if (point.openingHours.text) {
                                    parts.push(`Sprechzeiten: ${point.openingHours.text}`);
                                }
                                if (point.openingHours.comment) {
                                    parts.push(`Hinweis zu Sprechzeiten: ${point.openingHours.comment}`);
                                }
                            }

                            if (point.social) {
                                const facebookValue = point.social.facebook || point.social.facebookHandle;
                                if (facebookValue) parts.push(`Facebook: ${facebookValue}`);

                                const instagramValue = point.social.instagram || point.social.instagramHandle;
                                if (instagramValue) parts.push(`Instagram: ${instagramValue}`);

                                const linkedinValue = point.social.linkedin || point.social.linkedinHandle;
                                if (linkedinValue) parts.push(`LinkedIn: ${linkedinValue}`);
                            }

                            const textToCopy = parts.join('\n');

                            const copySuccess = () => {
                                const icon = copyButton.querySelector('img');
                                if (!icon) return;
                                const originalIconSrc = 'assets/icons/Clipboard32x32.svg';
                                icon.src = 'assets/icons/ClipboardCheck32x32.svg';
                                copyButton.classList.add('copied');

                                setTimeout(() => {
                                    icon.src = originalIconSrc;
                                    copyButton.classList.remove('copied');
                                }, 1000);
                            };

                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(textToCopy).then(copySuccess).catch(err => {
                                    console.error('Failed to copy with clipboard API, trying fallback: ', err);
                                    fallbackCopyTextToClipboard(textToCopy, copySuccess);
                                });
                            } else {
                                fallbackCopyTextToClipboard(textToCopy, copySuccess);
                            }
                        });
                    }

                    contactList.appendChild(clone);
                });
            }
        }
    };

    const autoSelectCountyOnMobile = () => {
        const mapContainer = document.getElementById('map-container');
        const isMobileView = window.getComputedStyle(mapContainer).display === 'none';

        const activeButton = filterBar.querySelector('button.active');
        const noCountySelected = !activeButton || activeButton.dataset.county === 'all';

        if (isMobileView && noCountySelected) {
            const firstCountyKey = Object.keys(allData)[0];
            if (firstCountyKey) {
                filterContactPoints(firstCountyKey);
            }
        }
    };

    /**
     * Fetches the contact point data from the JSON file,
     * then initializes the application by rendering the data and setting up filters.
     */
    fetch('contact-points.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            renderContactPoints();
            createFilterBar();
            filterContactPoints('all');
            autoSelectCountyOnMobile();
        })
        .catch(error => console.error('Error fetching contact points:', error));

    window.addEventListener('resize', autoSelectCountyOnMobile);

    sachsenMapObject.addEventListener('dragstart', (e) => e.preventDefault());

    /**
     * Sets up event listeners for the SVG map once it has loaded.
     * This includes click handlers for counties to trigger filtering.
     */
    sachsenMapObject.addEventListener('load', () => {
        const svgDoc = sachsenMapObject.contentDocument;
        if (!svgDoc) return;

        svgDoc.addEventListener('mousedown', (e) => e.preventDefault());
        svgDoc.addEventListener('dragstart', (e) => e.preventDefault());

        const counties = svgDoc.querySelectorAll('#counties path');
        counties.forEach(county => {
            county.addEventListener('click', (event) => {
                const countyId = event.currentTarget.id;
                if (activeCountyPath && activeCountyPath.id === countyId) {
                    filterContactPoints('all');
                } else {
                    filterContactPoints(countyId);
                }
            });
        });

        const mapBackground = svgDoc.getElementById('map');
        if (mapBackground) {
            mapBackground.addEventListener('click', (event) => {
                if (event.target.id === 'map') {
                    filterContactPoints('all');
                }
            });
        }
    });
});
