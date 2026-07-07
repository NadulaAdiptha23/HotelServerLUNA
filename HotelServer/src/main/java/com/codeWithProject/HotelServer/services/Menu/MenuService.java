package com.codeWithProject.HotelServer.services.Menu;

import com.codeWithProject.HotelServer.entity.MenuItem;
import com.codeWithProject.HotelServer.enums.MenuCategory;
import com.codeWithProject.HotelServer.repository.MenuRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MenuService {

    @Autowired
    private MenuRepository menuRepository;

    private void validateMenuItem(MenuItem item) {
        if (item == null) {
            throw new RuntimeException("Menu item details are required");
        }

        if (item.getName() == null || item.getName().trim().isEmpty()) {
            throw new RuntimeException("Menu item name is required");
        }

        if (item.getPrice() <= 0) {
            throw new RuntimeException("Menu item price must be greater than 0");
        }

        if (item.getCategory() == null) {
            throw new RuntimeException("Menu item category is required");
        }
    }

    // CREATE
    public MenuItem addMenuItem(MenuItem item) {
        validateMenuItem(item);

        item.setName(item.getName().trim());

        if (menuRepository.existsByNameIgnoreCase(item.getName())) {
            throw new RuntimeException("Menu item name already exists");
        }

        return menuRepository.save(item);
    }

    // READ ALL
    public List<MenuItem> getAllItems() {
        return menuRepository.findAll();
    }

    // READ BY CATEGORY
    public List<MenuItem> getByCategory(MenuCategory category) {
        return menuRepository.findByCategory(category);
    }

    // UPDATE
    public MenuItem updateMenuItem(Long id, MenuItem updatedItem) {
        validateMenuItem(updatedItem);

        MenuItem item = menuRepository.findById(id).orElse(null);

        if (item != null) {
            String updatedName = updatedItem.getName().trim();

            if (!item.getName().equalsIgnoreCase(updatedName)
                    && menuRepository.existsByNameIgnoreCase(updatedName)) {
                throw new RuntimeException("Menu item name already exists");
            }

            item.setName(updatedName);
            item.setPrice(updatedItem.getPrice());
            item.setCategory(updatedItem.getCategory());
            return menuRepository.save(item);
        }
        return null;
    }

    // DELETE
    public void deleteMenuItem(Long id) {
        menuRepository.deleteById(id);
    }
}
