import { NavLink } from 'react-router'
import { useCategories } from '../hooks/useTaxonomy.js'
import SearchBox from './SearchBox.jsx'

// The sections of the publication, and the search box. Sections with no published story are left out
// (a menu of empty pages helps nobody); if the list cannot be loaded the strip simply shows the search box.
export default function SectionNav() {
  const { data: categories } = useCategories()
  const sections = (categories ?? []).filter((category) => category.postCount > 0)

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
      {sections.length > 0 ? (
        <nav aria-label="Sections" className="-mx-1 max-w-full overflow-x-auto">
          <ul className="flex gap-x-5 px-1 whitespace-nowrap">
            {sections.map((category) => (
              <li key={category.slug}>
                <NavLink
                  to={`/category/${encodeURIComponent(category.slug)}`}
                  className={({ isActive }) =>
                    `link-slide kicker inline-block py-1.5 ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`
                  }
                >
                  {category.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <span />
      )}
      <SearchBox />
    </div>
  )
}
