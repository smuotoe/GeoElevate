import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

/**
 * Reusable breadcrumb navigation component.
 * Displays a hierarchical navigation trail with clickable links.
 *
 * @param {Object} props - Component props
 * @param {Array<{label: string, path: string|null}>} props.items - Breadcrumb items
 *   Each item has a label to display and a path for navigation.
 *   The last item's path is typically null as it represents the current page.
 * @returns {React.ReactElement} Breadcrumb navigation component
 *
 * @example
 * <Breadcrumb items={[
 *   { label: 'Games', path: '/games' },
 *   { label: 'Flags', path: '/games/flags' },
 *   { label: 'Play', path: null }
 * ]} />
 */
function Breadcrumb({ items }) {
    if (!items || items.length === 0) {
        return null
    }

    const separatorStyle = {
        margin: '0 8px',
        color: 'var(--text-secondary)'
    }

    return (
        <nav aria-label="Breadcrumb">
            <ol style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((item, index) => {
                    const isLast = index === items.length - 1

                    return (
                        <li key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                            {index > 0 && (
                                <span style={separatorStyle} aria-hidden="true">
                                    &gt;
                                </span>
                            )}
                            {isLast || !item.path ? (
                                <span className="text-primary" aria-current="page">
                                    {item.label}
                                </span>
                            ) : (
                                <Link to={item.path} className="text-secondary">
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}

Breadcrumb.propTypes = {
    items: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            path: PropTypes.string
        })
    ).isRequired
}

export default Breadcrumb
